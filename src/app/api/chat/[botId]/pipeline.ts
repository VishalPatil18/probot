import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { EmbeddingError } from "@/lib/ai/embeddings";
import { callWithBreaker } from "@/lib/ai/circuit-breaker";
import {
  KeyTransportError,
  readApiKey,
  readAzureCreds,
  readEmbeddingApiKey,
} from "@/lib/ai/key-transport";
import {
  type LLMProvider,
  ProviderError,
  type ProviderName,
  getProvider,
  isProviderName,
} from "@/lib/ai/providers";
import { checkRateLimit, resolveMaxChars } from "@/lib/ai/rate-limit";
import { verifyPreviewToken } from "@/lib/bots/preview-token";
import { RATE_LIMIT_MAX_CHARS_MAX } from "@/lib/bots/schemas";
import { KekUnavailableError, decryptKey } from "@/lib/crypto/envelope";
import { extractRequesterIp, hashIp } from "@/lib/crypto/ip-hash";
import {
  bots,
  conversations,
  db,
  decryptAuditLog,
  encryptedLlmKeys,
  messages,
  users,
} from "@/lib/db";
import { alertCircuitOpen } from "@/lib/server/alert";
import { retrieveRelevant } from "@/lib/rag/retrieve";

export const MAX_BODY_BYTES = 16_384;

// Outer Zod cap kept at the absolute ceiling; the per-bot `maxChars`
// override clamps further down at request time (see enforceLimits).
const chatInput = z.object({
  message: z.string().min(1).max(RATE_LIMIT_MAX_CHARS_MAX),
  // Client-generated per-tab UUID from sessionStorage. Required
  // so the chat orchestrator can UPSERT a `conversations` row and persist
  // the user/assistant turn into `messages` for the dashboard analytics
  // surface.
  sessionId: z.string().uuid(),
});

export type BotRow = NonNullable<
  Awaited<ReturnType<typeof db.query.bots.findFirst>>
>;
export type OwnerRow = Pick<
  typeof users.$inferSelect,
  "id" | "username" | "llmProvider" | "llmModel"
>;

// Steps 1-5: content-type, optional BYO key header, body size cap, JSON parse,
// Zod validation. Returns the validated payload + the header key (if any).
export async function parseChatRequest(
  request: Request,
): Promise<
  | { ok: true; message: string; sessionId: string; headerApiKey: string | null }
  | { ok: false; response: Response }
> {
  // 1. Content-Type
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unsupported_media_type" },
        { status: 415 },
      ),
    };
  }

  // 2. BYO key header is OPTIONAL now. The chat route
  // tries the header first, then falls back to the managed-key decrypt
  // path against `encrypted_llm_keys`. Whichever source resolves wins.
  // Header-supplied key always wins so a creator testing locally can
  // override a stored managed key without revoking it. A missing header
  // is fine; a *malformed* header (empty / too short / too long) still
  // 400s loudly because that's almost always a client bug.
  let headerApiKey: string | null = null;
  try {
    headerApiKey = readApiKey(request.headers);
  } catch (err) {
    if (!(err instanceof KeyTransportError)) throw err;
    if (err.reason !== "missing") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "missing_llm_key" },
          { status: 400 },
        ),
      };
    }
    headerApiKey = null;
  }

  // 3. Body read with enforced size cap. Content-Length is a client-supplied
  // hint and can be spoofed/omitted, so we measure the actual bytes here.
  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "request_too_large" },
        { status: 413 },
      ),
    };
  }

  // 4. JSON parse
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_json" }, { status: 400 }),
    };
  }

  // 5. Zod validate
  const parsed = chatInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "validation_failed", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true,
    message: parsed.data.message,
    sessionId: parsed.data.sessionId,
    headerApiKey,
  };
}

// Steps 6, 6b, 7: bot lookup, draft preview-token authorization, owner lookup.
export async function loadBotAndOwner(
  request: Request,
  botId: string,
): Promise<
  | { ok: true; botRow: BotRow; ownerRow: OwnerRow }
  | { ok: false; response: Response }
> {
  // 6. Bot lookup. We pull the bot regardless of `is_active` so we can
  // separately authorize draft bots via a preview token.
  const botRow = await db.query.bots.findFirst({
    where: eq(bots.id, botId),
  });
  if (!botRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "bot_not_found" }, { status: 404 }),
    };
  }

  // 6b. Draft-mode access. An inactive bot can still be chatted with by the
  // owner via a signed preview token (sent as `x-preview-token` header or as
  // a `?preview=` query param, whichever the client uses). The header path
  // is preferred for the wizard's preview chat; the query-param path is
  // accepted so a creator can manually paste the preview URL into a tab and
  // it still works.
  if (!botRow.isActive) {
    const headerToken = request.headers.get("x-preview-token") ?? "";
    const urlToken = new URL(request.url).searchParams.get("preview") ?? "";
    const candidate = headerToken || urlToken;
    const valid =
      candidate.length > 0 &&
      botRow.previewToken !== null &&
      candidate === botRow.previewToken &&
      verifyPreviewToken(candidate)?.botId === botRow.id;
    if (!valid) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "bot_not_found" },
          { status: 404 },
        ),
      };
    }
  }

  // 7. Owner lookup (for llm provider + model preferences)
  const ownerRow = await db.query.users.findFirst({
    where: eq(users.id, botRow.userId),
    columns: { id: true, username: true, llmProvider: true, llmModel: true },
  });
  if (!ownerRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "bot_not_found" }, { status: 404 }),
    };
  }

  return { ok: true, botRow, ownerRow };
}

// Steps 8, 8b: per-bot rate limit + per-bot maxChars ceiling.
export async function enforceLimits(
  botRow: BotRow,
  message: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  // 8. Rate limit (per-bot, with per-bot overrides from the bot row).
  // The limiter clamps unreasonable values internally; the Zod schema on the
  // PATCH endpoint also bounds what can be stored.
  const rl = await checkRateLimit(botRow.id, {
    perMinute: botRow.rateLimitPerMinute,
    perDay: botRow.rateLimitPerDay,
  });
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limit", scope: rl.scope, resetAt: rl.resetAt },
        { status: 429 },
      ),
    };
  }

  // 8b. Per-bot maxChars override. The outer Zod schema accepts up to
  // RATE_LIMIT_MAX_CHARS_MAX; here we enforce the per-bot ceiling (or the
  // env default of 8000) before sending to the LLM.
  const effectiveMaxChars = resolveMaxChars(botRow.rateLimitMaxChars);
  if (message.length > effectiveMaxChars) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "message_too_long", maxChars: effectiveMaxChars },
        { status: 400 },
      ),
    };
  }

  return { ok: true };
}

// Step 9b: optional RAG retrieval. Embedding key is optional - when absent OR
// when no chunks pass the similarity floor, we fall through to the legacy
// full-context path. Retrieval failures (bad key, OpenAI down, etc.) also
// fall back silently rather than 5xx the chat request.
export async function retrieveChunks(
  request: Request,
  botId: string,
  query: string,
): Promise<string[] | undefined> {
  let relevantChunks: string[] | undefined;
  let embeddingApiKey: string | null = null;
  try {
    embeddingApiKey = readEmbeddingApiKey(request.headers);
  } catch (err) {
    if (!(err instanceof KeyTransportError)) throw err;
    // Malformed embedding header: treat as missing, do not fail chat.
    embeddingApiKey = null;
  }
  if (embeddingApiKey) {
    try {
      const retrieved = await retrieveRelevant({
        botId,
        query,
        apiKey: embeddingApiKey,
      });
      if (retrieved.length > 0) {
        relevantChunks = retrieved.map((r) => r.contentText);
      }
    } catch (err: unknown) {
      // Retrieval failure → fall back to full-context. Chat must keep
      // working even if pgvector or the embedding API is unavailable.
      // We DO want an observable signal so a broken HNSW index or stored
      // dimension mismatch doesn't silently degrade every user.
      // `EmbeddingError.toJSON()` is bounded (no raw message, no key); plain
      // errors collapse to a generic category so we never echo SDK-layer
      // strings that may carry the BYO key.
      const signal =
        err instanceof EmbeddingError
          ? err.toJSON()
          : { category: "retrieval_failed" };
      // eslint-disable-next-line no-console -- intentional ops signal; safe shape, no raw error
      console.warn(
        "[rag] retrieval failed, falling back to context_text",
        signal,
      );
      relevantChunks = undefined;
    }
  }
  return relevantChunks;
}

// Steps 10, 10b: validate the owner's provider, then resolve the LLM API key.
// Priority: header (self-host / creator local test) > managed encrypted key
// (DB) > fail. Azure is the one exception: its multi-secret credential (key +
// endpoint + apiVersion) isn't stored managed-side, so Azure bots must use the
// header path.
export async function resolveProviderAndKey(
  botRow: BotRow,
  ownerRow: OwnerRow,
  headerApiKey: string | null,
): Promise<
  | {
      ok: true;
      providerName: ProviderName;
      provider: LLMProvider;
      apiKey: string;
      managedKeyUsed: boolean;
    }
  | { ok: false; response: Response }
> {
  // 10. Provider dispatch
  if (!isProviderName(ownerRow.llmProvider)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "provider_unavailable" },
        { status: 502 },
      ),
    };
  }
  const providerName = ownerRow.llmProvider;
  const provider = getProvider(providerName);

  // 10b. Resolve the LLM API key.
  let apiKey: string;
  let managedKeyUsed = false;
  if (headerApiKey) {
    apiKey = headerApiKey;
  } else if (providerName === "azure") {
    return {
      ok: false,
      response: NextResponse.json({ error: "missing_llm_key" }, { status: 400 }),
    };
  } else {
    const stored = await db.query.encryptedLlmKeys.findFirst({
      where: eq(encryptedLlmKeys.botId, botRow.id),
    });
    if (!stored) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "missing_llm_key" },
          { status: 400 },
        ),
      };
    }
    if (stored.provider !== providerName) {
      // Provider switched after the key was stored - safer to refuse than
      // to send an Anthropic key to an OpenAI endpoint (or vice versa).
      return {
        ok: false,
        response: NextResponse.json(
          { error: "managed_key_provider_mismatch" },
          { status: 400 },
        ),
      };
    }
    try {
      apiKey = decryptKey({
        ciphertext: stored.ciphertext,
        iv: stored.iv,
        authTag: stored.authTag,
        wrappedDek: stored.wrappedDek,
        dekIv: stored.dekIv,
        dekAuthTag: stored.dekAuthTag,
      });
    } catch (err) {
      if (err instanceof KekUnavailableError) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "managed_storage_unavailable" },
            { status: 503 },
          ),
        };
      }
      throw err;
    }
    managedKeyUsed = true;
  }

  return { ok: true, providerName, provider, apiKey, managedKeyUsed };
}

// Azure needs three extra runtime values (endpoint, apiVersion, deployment).
// Endpoint + apiVersion ride in custom headers (read here); deployment is
// persisted in `users.llmModel`. Missing endpoint when provider is azure is
// the same UX class as a missing api key - both mean "your provider settings
// are incomplete." Non-Azure providers resolve to no extras.
export function resolveAzureExtras(
  request: Request,
  providerName: ProviderName,
):
  | { ok: true; extras: Record<string, string> | undefined }
  | { ok: false; response: Response } {
  if (providerName !== "azure") {
    return { ok: true, extras: undefined };
  }
  let azureCreds: ReturnType<typeof readAzureCreds>;
  try {
    azureCreds = readAzureCreds(request.headers);
  } catch (err) {
    if (err instanceof KeyTransportError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "missing_llm_key" },
          { status: 400 },
        ),
      };
    }
    throw err;
  }
  if (!azureCreds) {
    return {
      ok: false,
      response: NextResponse.json({ error: "missing_llm_key" }, { status: 400 }),
    };
  }
  const extras: Record<string, string> = { endpoint: azureCreds.endpoint };
  if (azureCreds.apiVersion !== null) {
    extras.apiVersion = azureCreds.apiVersion;
  }
  return { ok: true, extras };
}

// Provider call wrapped in a per-provider circuit breaker. The
// breaker key is the provider NAME, not the bot id, so a single broken
// upstream (e.g. Anthropic outage) trips one breaker that protects every bot
// on that provider. Returns either the raw reply or a ready-to-send Response
// (including the friendly 200 fallback when the breaker is open).
export async function callProvider(args: {
  providerName: ProviderName;
  provider: LLMProvider;
  system: string;
  userMessage: string;
  apiKey: string;
  model: string | null;
  extras: Record<string, string> | undefined;
}): Promise<{ ok: true; reply: string } | { ok: false; response: Response }> {
  const { providerName, provider, system, userMessage, apiKey, model, extras } =
    args;
  try {
    const result = await callWithBreaker(
      providerName,
      () =>
        provider.complete({
          system,
          userMessage,
          apiKey,
          model: model ?? undefined,
          extras,
        }),
      { onOpen: alertCircuitOpen },
    );
    return { ok: true, reply: result.reply };
  } catch (err) {
    if (err instanceof ProviderError) {
      if (err.category === "invalid_key") {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "invalid_llm_key" },
            { status: 400 },
          ),
        };
      }
      if (err.category === "rate_limit") {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "provider_rate_limit" },
            { status: 429 },
          ),
        };
      }
      // Graceful fallback: when the breaker is open OR the
      // provider returns "unknown" (network blip, malformed response), we
      // surface a friendly canned reply rather than a hard 502. The
      // client renders this as an assistant message asking the recruiter
      // to try again, with a `fallback: true` flag for analytics. The
      // chat persistence block below still runs so the dashboard sees
      // these requests in its conversation count.
      if (err.message === "circuit_open") {
        return {
          ok: false,
          response: NextResponse.json(
            {
              reply:
                "I'm temporarily unavailable - the AI provider isn't responding right now. Please try again in a minute.",
              fallback: "circuit_open",
            },
            { status: 200 },
          ),
        };
      }
      return {
        ok: false,
        response: NextResponse.json(
          { error: "provider_unavailable" },
          { status: 502 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "provider_unavailable" },
        { status: 502 },
      ),
    };
  }
}

// Step 11b: record a decrypt-audit-log row when the managed key was actually
// used. Wrapped in try/catch so a logging failure cannot block the
// user-facing chat reply.
export async function recordDecryptAudit(
  request: Request,
  botId: string,
): Promise<void> {
  try {
    const ipHash = hashIp(extractRequesterIp(request.headers));
    await db.insert(decryptAuditLog).values({
      botId,
      ...(ipHash !== null ? { requesterIpHash: ipHash } : {}),
    });
  } catch (err) {
    console.warn("[chat] decrypt audit-log write failed", err);
  }
}

// Step 12: persist conversation + messages (analytics). UPSERT on
// (bot_id, session_id) - concurrent tabs on the same bot for the same
// recruiter coalesce into one conversation. Wrapped in try/catch so analytics
// persistence MUST NOT break the user-facing chat reply. Returns the
// conversation id on success (used by the in-chat lead-capture card), or
// undefined when persistence failed.
export async function persistConversation(args: {
  botId: string;
  sessionId: string;
  userMessage: string;
  reply: string;
}): Promise<string | undefined> {
  const { botId, sessionId, userMessage, reply } = args;
  let conversationId: string | undefined;
  try {
    await db.transaction(async (tx) => {
      const [convo] = await tx
        .insert(conversations)
        .values({ botId, sessionId })
        .onConflictDoUpdate({
          target: [conversations.botId, conversations.sessionId],
          set: {
            messageCount: sql`${conversations.messageCount} + 2`,
            lastMessageAt: new Date(),
          },
        })
        .returning({ id: conversations.id });
      if (!convo) return;
      conversationId = convo.id;
      await tx.insert(messages).values([
        {
          conversationId: convo.id,
          role: "user",
          content: userMessage,
        },
        { conversationId: convo.id, role: "assistant", content: reply },
      ]);
    });
  } catch (err) {
    // Swallow - analytics persistence never blocks chat. Log so operators
    // can still spot pool exhaustion / missing migrations / etc. before
    // a future change wires a structured logger. Matches the [rag] warn
    // pattern used for the analogous retrieval-failure case. `conversationId`
    // stays undefined in this branch; the lead-capture client then falls back
    // to the 24h (botId, email) dedupe window without the convo-scoped
    // enrichment.
    console.warn("[chat] conversation persistence failed", err);
  }
  return conversationId;
}
