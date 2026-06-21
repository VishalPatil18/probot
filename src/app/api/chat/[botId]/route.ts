import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { EmbeddingError } from "@/lib/ai/embeddings";
import {
  KeyTransportError,
  readApiKey,
  readAzureCreds,
  readEmbeddingApiKey,
} from "@/lib/ai/key-transport";
import { corsPreflight } from "@/lib/bots/cors-headers";

// Stage 5: CORS preflight for the embeddable widget. The widget POSTs from
// arbitrary origins (janedoe.com, etc.) so the browser fires OPTIONS first.
// next.config.js sets CORS headers on the POST response; this handler
// answers the preflight before the POST fires.
export function OPTIONS(): Response {
  return corsPreflight();
}
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { ProviderError, getProvider, isProviderName } from "@/lib/ai/providers";
import { checkRateLimit, resolveMaxChars } from "@/lib/ai/rate-limit";
import { sanitizeInput } from "@/lib/ai/sanitize-input";
import { sanitizeOutput } from "@/lib/ai/sanitize-output";
import { verifyPreviewToken } from "@/lib/bots/preview-token";
import type { Personality } from "@/lib/bots/schemas";
import {
  PERSONALITY_PRESETS,
  RATE_LIMIT_MAX_CHARS_MAX,
} from "@/lib/bots/schemas";
import { bots, conversations, db, messages, users } from "@/lib/db";
import { retrieveRelevant } from "@/lib/rag/retrieve";

const MAX_BODY_BYTES = 16_384;

// Outer Zod cap kept at the absolute ceiling; the per-bot `maxChars`
// override clamps further down at request time (see step 5b).
const chatInput = z.object({
  message: z.string().min(1).max(RATE_LIMIT_MAX_CHARS_MAX),
  // Stage 6: client-generated per-tab UUID from sessionStorage. Required
  // so the chat orchestrator can UPSERT a `conversations` row and persist
  // the user/assistant turn into `messages` for the dashboard analytics
  // surface. See claude/plan.md §6.
  sessionId: z.string().uuid(),
});

function isPersonality(value: string): value is Personality {
  return (PERSONALITY_PRESETS as readonly string[]).includes(value);
}

type RouteContext = { params: { botId: string } };

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  // 1. Content-Type
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "unsupported_media_type" },
      { status: 415 },
    );
  }

  // 2. BYO key header (cheap fast-fail before reading the body)
  let apiKey: string;
  try {
    apiKey = readApiKey(request.headers);
  } catch (err) {
    if (err instanceof KeyTransportError) {
      return NextResponse.json({ error: "missing_llm_key" }, { status: 400 });
    }
    throw err;
  }

  // 3. Body read with enforced size cap. Content-Length is a client-supplied
  // hint and can be spoofed/omitted, so we measure the actual bytes here.
  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  // 4. JSON parse
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 5. Zod validate
  const parsed = chatInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 6. Bot lookup. We pull the bot regardless of `is_active` so we can
  // separately authorize draft bots via a preview token (Stage 7 §FR-002.10).
  const botRow = await db.query.bots.findFirst({
    where: eq(bots.id, params.botId),
  });
  if (!botRow) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
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
      return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
    }
  }

  // 7. Owner lookup (for llm provider + model preferences)
  const ownerRow = await db.query.users.findFirst({
    where: eq(users.id, botRow.userId),
    columns: { id: true, username: true, llmProvider: true, llmModel: true },
  });
  if (!ownerRow) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
  }

  // 8. Rate limit (per-bot, with per-bot overrides from the Stage-7 columns).
  // The limiter clamps unreasonable values internally; the Zod schema on the
  // PATCH endpoint also bounds what can be stored.
  const rl = checkRateLimit(botRow.id, {
    perMinute: botRow.rateLimitPerMinute,
    perDay: botRow.rateLimitPerDay,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit", scope: rl.scope, resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  // 8b. Per-bot maxChars override. The outer Zod schema accepts up to
  // RATE_LIMIT_MAX_CHARS_MAX; here we enforce the per-bot ceiling (or the
  // env default of 8000) before sending to the LLM.
  const effectiveMaxChars = resolveMaxChars(botRow.rateLimitMaxChars);
  if (parsed.data.message.length > effectiveMaxChars) {
    return NextResponse.json(
      {
        error: "message_too_long",
        maxChars: effectiveMaxChars,
      },
      { status: 400 },
    );
  }

  // 9. Input sanitize
  const sanitized = sanitizeInput(parsed.data.message);
  if (!sanitized.ok) {
    return NextResponse.json(
      { error: "blocked", reason: sanitized.reason },
      { status: 400 },
    );
  }

  // 9b. Stage 3 RAG retrieval. Embedding key is optional - when absent OR
  // when no chunks pass the similarity floor, we fall through to the legacy
  // full-context path. Retrieval failures (bad key, OpenAI down, etc.) also
  // fall back silently rather than 5xx the chat request.
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
        botId: botRow.id,
        query: sanitized.message,
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

  // 10. Provider dispatch
  if (!isProviderName(ownerRow.llmProvider)) {
    return NextResponse.json(
      { error: "provider_unavailable" },
      { status: 502 },
    );
  }
  const provider = getProvider(ownerRow.llmProvider);
  const personality: Personality = isPersonality(botRow.personality)
    ? botRow.personality
    : "professional";
  const system = buildSystemPrompt({
    bot: {
      name: botRow.name,
      personality,
      contextText: botRow.contextText,
      customInstructions: botRow.customInstructions,
    },
    ownerUsername: ownerRow.username,
    ...(relevantChunks ? { relevantChunks } : {}),
  });

  // Azure needs three extra runtime values (endpoint, apiVersion, deployment).
  // Endpoint + apiVersion ride in custom headers (read here); deployment is
  // persisted in `users.llmModel`. Missing endpoint when provider is azure is
  // the same UX class as a missing api key - both mean "your provider
  // settings are incomplete."
  let extras: Record<string, string> | undefined;
  if (ownerRow.llmProvider === "azure") {
    let azureCreds: ReturnType<typeof readAzureCreds>;
    try {
      azureCreds = readAzureCreds(request.headers);
    } catch (err) {
      if (err instanceof KeyTransportError) {
        return NextResponse.json({ error: "missing_llm_key" }, { status: 400 });
      }
      throw err;
    }
    if (!azureCreds) {
      return NextResponse.json({ error: "missing_llm_key" }, { status: 400 });
    }
    extras = { endpoint: azureCreds.endpoint };
    if (azureCreds.apiVersion !== null) {
      extras.apiVersion = azureCreds.apiVersion;
    }
  }

  let providerReply: string;
  try {
    const result = await provider.complete({
      system,
      userMessage: sanitized.message,
      apiKey,
      model: ownerRow.llmModel ?? undefined,
      extras,
    });
    providerReply = result.reply;
  } catch (err) {
    if (err instanceof ProviderError) {
      if (err.category === "invalid_key") {
        return NextResponse.json({ error: "invalid_llm_key" }, { status: 400 });
      }
      if (err.category === "rate_limit") {
        return NextResponse.json(
          { error: "provider_rate_limit" },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: "provider_unavailable" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "provider_unavailable" },
      { status: 502 },
    );
  }

  // 11. Output sanitize
  const reply = sanitizeOutput(providerReply);

  // 12. Persist conversation + messages (Stage 6 analytics).
  // UPSERT on (bot_id, session_id) - concurrent tabs on the same bot for
  // the same recruiter coalesce into one conversation. Both message inserts
  // happen in the same transaction so partial writes can't skew metrics.
  // Wrapped in try/catch so analytics persistence MUST NOT break the
  // user-facing chat reply (the primary value). Logged via Stage 7 once a
  // structured logger lands. On success, capture the conversation id so we
  // can return it to the client - the in-chat lead-capture card (slice
  // 6.4) sends it on POST /api/bots/[botId]/leads to enable the idempotent
  // (botId, conversationId, email) dedupe + recruiter_email update path.
  let conversationId: string | undefined;
  try {
    await db.transaction(async (tx) => {
      const [convo] = await tx
        .insert(conversations)
        .values({ botId: params.botId, sessionId: parsed.data.sessionId })
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
          content: sanitized.message,
        },
        { conversationId: convo.id, role: "assistant", content: reply },
      ]);
    });
  } catch (err) {
    // Swallow - analytics persistence never blocks chat. Log so operators
    // can still spot pool exhaustion / missing migrations / etc. before
    // Stage 7 wires a structured logger. Matches the [rag] warn pattern
    // used above for the analogous "fallback path on retrieval failure"
    // case. `conversationId` stays undefined in this branch; the
    // lead-capture client then falls back to the 24h (botId, email)
    // dedupe window without the convo-scoped enrichment.
    console.warn("[chat] conversation persistence failed", err);
  }

  // 13. Done
  return NextResponse.json({ reply, conversationId });
}
