import { NextResponse } from "next/server";

import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { sanitizeInput } from "@/lib/ai/sanitize-input";
import { sanitizeOutput } from "@/lib/ai/sanitize-output";
import { corsPreflight } from "@/lib/bots/cors-headers";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";

import {
  callProvider,
  enforceLimits,
  loadBotAndOwner,
  parseChatRequest,
  persistConversation,
  recordDecryptAudit,
  resolveAzureExtras,
  resolveProviderAndKey,
  retrieveChunks,
} from "./pipeline";

// CORS preflight for the embeddable widget. The widget POSTs from
// arbitrary origins (janedoe.com, etc.) so the browser fires OPTIONS first.
// next.config.js sets CORS headers on the POST response; this handler
// answers the preflight before the POST fires.
export function OPTIONS(): Response {
  return corsPreflight();
}

function isPersonality(value: string): value is Personality {
  return (PERSONALITY_PRESETS as readonly string[]).includes(value);
}

type RouteContext = { params: { botId: string } };

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  // 1-5. Content-type, optional BYO key header, body size cap, parse, validate.
  const parsed = await parseChatRequest(request);
  if (!parsed.ok) return parsed.response;

  // 6-7. Bot lookup (+ draft preview-token auth) and owner lookup.
  const loaded = await loadBotAndOwner(request, params.botId);
  if (!loaded.ok) return loaded.response;
  const { botRow, ownerRow } = loaded;

  // 8-8b. Per-bot rate limit + maxChars ceiling.
  const limited = await enforceLimits(botRow, parsed.message);
  if (!limited.ok) return limited.response;

  // 9. Input sanitize
  const sanitized = sanitizeInput(parsed.message);
  if (!sanitized.ok) {
    return NextResponse.json(
      { error: "blocked", reason: sanitized.reason },
      { status: 400 },
    );
  }

  // 9b. Optional RAG retrieval (falls back to full-context on any failure).
  const relevantChunks = await retrieveChunks(
    request,
    botRow.id,
    sanitized.message,
  );

  // 10-10b. Resolve provider + LLM API key (header > managed > fail).
  const resolved = await resolveProviderAndKey(
    botRow,
    ownerRow,
    parsed.headerApiKey,
  );
  if (!resolved.ok) return resolved.response;
  const { providerName, provider, apiKey, managedKeyUsed } = resolved;

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

  // Azure-only: endpoint + apiVersion ride in custom headers.
  const azure = resolveAzureExtras(request, providerName);
  if (!azure.ok) return azure.response;

  // Provider call (per-provider circuit breaker + graceful fallback).
  const called = await callProvider({
    providerName,
    provider,
    system,
    userMessage: sanitized.message,
    apiKey,
    model: ownerRow.llmModel,
    extras: azure.extras,
  });
  if (!called.ok) return called.response;

  // 11. Output sanitize
  const reply = sanitizeOutput(called.reply);

  // 11b. Decrypt audit-log row when the managed key served the request.
  if (managedKeyUsed) {
    await recordDecryptAudit(request, botRow.id);
  }

  // 12. Persist conversation + messages (analytics; never blocks the reply).
  const conversationId = await persistConversation({
    botId: params.botId,
    sessionId: parsed.sessionId,
    userMessage: sanitized.message,
    reply,
  });

  // 13. Done
  return NextResponse.json({ reply, conversationId });
}
