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
  const parsed = await parseChatRequest(request);
  if (!parsed.ok) return parsed.response;

  const loaded = await loadBotAndOwner(request, params.botId);
  if (!loaded.ok) return loaded.response;
  const { botRow, ownerRow } = loaded;

  const limited = await enforceLimits(botRow, parsed.message);
  if (!limited.ok) return limited.response;

  const sanitized = sanitizeInput(parsed.message);
  if (!sanitized.ok) {
    return NextResponse.json(
      { error: "blocked", reason: sanitized.reason },
      { status: 400 },
    );
  }

  const relevantChunks = await retrieveChunks(
    request,
    botRow.id,
    sanitized.message,
  );

  const resolved = await resolveProviderAndKey(
    botRow,
    ownerRow,
    parsed.headerApiKey,
  );
  if (!resolved.ok) return resolved.response;
  const { providerName, provider, apiKey, managedKeyUsed, managedAzure } =
    resolved;

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

  const azure = resolveAzureExtras(request, providerName, managedAzure);
  if (!azure.ok) return azure.response;

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

  const reply = sanitizeOutput(called.reply);

  if (managedKeyUsed) {
    await recordDecryptAudit(request, botRow.id);
  }

  const conversationId = await persistConversation({
    botId: params.botId,
    sessionId: parsed.sessionId,
    userMessage: sanitized.message,
    reply,
    ownerUserId: botRow.userId,
    botName: botRow.name,
  });

  return NextResponse.json({ reply, conversationId });
}
