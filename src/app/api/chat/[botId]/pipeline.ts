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
import { emitNotification } from "@/lib/notifications/emit";
import { alertCircuitOpen } from "@/lib/server/alert";
import { retrieveRelevant } from "@/lib/rag/retrieve";

export const MAX_BODY_BYTES = 16_384;

const chatInput = z.object({
  message: z.string().min(1).max(RATE_LIMIT_MAX_CHARS_MAX),
  sessionId: z.string().uuid(),
});

export type BotRow = NonNullable<
  Awaited<ReturnType<typeof db.query.bots.findFirst>>
>;
export type OwnerRow = Pick<
  typeof users.$inferSelect,
  "id" | "username" | "llmProvider" | "llmModel"
>;

export async function parseChatRequest(
  request: Request,
): Promise<
  | { ok: true; message: string; sessionId: string; headerApiKey: string | null }
  | { ok: false; response: Response }
> {
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

  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_json" }, { status: 400 }),
    };
  }

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

export async function loadBotAndOwner(
  request: Request,
  botId: string,
): Promise<
  | { ok: true; botRow: BotRow; ownerRow: OwnerRow }
  | { ok: false; response: Response }
> {
  const botRow = await db.query.bots.findFirst({
    where: eq(bots.id, botId),
  });
  if (!botRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "bot_not_found" }, { status: 404 }),
    };
  }

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

export async function enforceLimits(
  botRow: BotRow,
  message: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
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
      managedAzure: { endpoint: string; apiVersion: string | null } | null;
    }
  | { ok: false; response: Response }
> {
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

  let apiKey: string;
  let managedKeyUsed = false;
  let managedAzure: { endpoint: string; apiVersion: string | null } | null =
    null;
  if (headerApiKey) {
    apiKey = headerApiKey;
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
      return {
        ok: false,
        response: NextResponse.json(
          { error: "managed_key_provider_mismatch" },
          { status: 400 },
        ),
      };
    }
    if (providerName === "azure") {
      if (!stored.azureEndpoint) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "missing_llm_key" },
            { status: 400 },
          ),
        };
      }
      managedAzure = {
        endpoint: stored.azureEndpoint,
        apiVersion: stored.azureApiVersion ?? null,
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

  return { ok: true, providerName, provider, apiKey, managedKeyUsed, managedAzure };
}

export function resolveAzureExtras(
  request: Request,
  providerName: ProviderName,
  managedAzure: { endpoint: string; apiVersion: string | null } | null = null,
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
  if (!azureCreds && managedAzure) {
    const extras: Record<string, string> = { endpoint: managedAzure.endpoint };
    if (managedAzure.apiVersion !== null) {
      extras.apiVersion = managedAzure.apiVersion;
    }
    return { ok: true, extras };
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

export async function persistConversation(args: {
  botId: string;
  sessionId: string;
  userMessage: string;
  reply: string;
  ownerUserId?: string;
  botName?: string;
}): Promise<string | undefined> {
  const { botId, sessionId, userMessage, reply, ownerUserId, botName } = args;
  let conversationId: string | undefined;
  let wasNewConversation = false;
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
        .returning({
          id: conversations.id,
          isInsert: sql<boolean>`xmax = 0`,
        });
      if (!convo) return;
      conversationId = convo.id;
      wasNewConversation = convo.isInsert === true;
      await tx.insert(messages).values([
        {
          conversationId: convo.id,
          role: "user",
          content: userMessage,
        },
        { conversationId: convo.id, role: "assistant", content: reply },
      ]);
    });
    if (wasNewConversation && ownerUserId) {
      void emitNotification({
        userId: ownerUserId,
        botId,
        kind: "conversation_started",
        payload: { botId, botName, sessionId, conversationId },
      });
    }
  } catch (err) {
    console.warn("[chat] conversation persistence failed", err);
  }
  return conversationId;
}
