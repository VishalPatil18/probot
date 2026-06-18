import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  KeyTransportError,
  readApiKey,
  readAzureCreds,
} from "@/lib/ai/key-transport";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { ProviderError, getProvider, isProviderName } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { sanitizeInput } from "@/lib/ai/sanitize-input";
import { sanitizeOutput } from "@/lib/ai/sanitize-output";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";
import { bots, db, users } from "@/lib/db";

const MAX_BODY_BYTES = 16_384;

const chatInput = z.object({
  message: z.string().min(1).max(8000),
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

  // 6. Bot lookup
  const botRow = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.isActive, true)),
  });
  if (!botRow) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
  }

  // 7. Owner lookup (for llm provider + model preferences)
  const ownerRow = await db.query.users.findFirst({
    where: eq(users.id, botRow.userId),
    columns: { id: true, username: true, llmProvider: true, llmModel: true },
  });
  if (!ownerRow) {
    return NextResponse.json({ error: "bot_not_found" }, { status: 404 });
  }

  // 8. Rate limit (per-bot)
  const rl = checkRateLimit(botRow.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit", scope: rl.scope, resetAt: rl.resetAt },
      { status: 429 },
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
    },
    ownerUsername: ownerRow.username,
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

  // 12. Done
  return NextResponse.json({ reply });
}
