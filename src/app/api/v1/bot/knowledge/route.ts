import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/lib/ai/rate-limit";
import { requireBotToken } from "@/lib/bot-tokens/service";
import { retrieveRelevant } from "@/lib/rag/retrieve";

// POST /api/v1/bot/knowledge
//
// "Vector retrieval as a service" for the self-hosted runtime. Given the
// visitor's message, returns the top knowledge chunks to inject into the
// runtime's own LLM prompt. The LLM call itself happens on the runtime's infra
// (the platform is NOT in the chat critical path), so the bot owner's LLM key
// never reaches the platform.
//
// - With an embedding key (forwarded by the runtime, never stored): pgvector
//   retrieval, same path as the managed chat route.
// - Without one: fall back to the bot's assembled full context.
//
// Rate-limited per bot (reusing the shared limiter) so a leaked token can't run
// up unbounded retrieval cost.

const bodySchema = z.object({
  query: z.string().min(1).max(8000),
  embeddingApiKey: z.string().min(1).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await requireBotToken(request.headers);
  if (!auth.ok) return auth.response;
  const { bot } = auth;

  const rl = await checkRateLimit(bot.id, {
    perMinute: bot.rateLimitPerMinute,
    perDay: bot.rateLimitPerDay,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit", scope: rl.scope, resetAt: rl.resetAt },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { query, embeddingApiKey } = parsed.data;

  if (embeddingApiKey) {
    try {
      const chunks = await retrieveRelevant({
        botId: bot.id,
        query,
        apiKey: embeddingApiKey,
      });
      return NextResponse.json({
        mode: "retrieval",
        chunks: chunks.map((c) => c.contentText),
      });
    } catch {
      // Retrieval failed (bad key, no embeddings) - fall back to full context,
      // mirroring the managed chat route's graceful degradation.
    }
  }

  return NextResponse.json({
    mode: "full_context",
    chunks: bot.contextText ? [bot.contextText] : [],
  });
}
