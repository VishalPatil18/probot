import { NextResponse } from "next/server";

import {
  getConfig,
  getKnowledge,
  postConversation,
} from "../../../lib/platform";

// The runtime's chat endpoint. Orchestrates: pull persona + knowledge from the
// platform, call the operator's OWN LLM (the key lives here, not on the
// platform), reply, and persist the transcript back to the platform so it
// shows up in the owner's ProBot dashboard.
//
// This is a deliberately small reference implementation - swap the LLM call for
// your provider of choice. The platform is never in the chat critical path: if
// it's slow, only the knowledge step is affected, not the reply.

export async function POST(request: Request): Promise<Response> {
  let body: { message?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  const sessionId = body.sessionId ?? crypto.randomUUID();
  if (!message) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const config = await getConfig();
  const chunks = await getKnowledge(
    message,
    process.env.PROBOT_EMBEDDING_API_KEY,
  );

  const system = [
    `You are ${config.name}'s AI assistant. ${config.headline ?? ""}`,
    "Answer ONLY from the context below. If it isn't covered, say you don't have that information.",
    "",
    "## CONTEXT",
    chunks.join("\n\n---\n\n"),
  ].join("\n");

  const reply = await callLlm(system, message);

  // Fire-and-forget: never block the reply on analytics persistence.
  void postConversation(sessionId, [
    { role: "user", content: message },
    { role: "assistant", content: reply },
  ]);

  return NextResponse.json({ reply, sessionId });
}

// Minimal chat call against any OpenAI-compatible endpoint, configured by env
// so you can point it at the provider of your choice without code changes:
//   PROBOT_LLM_BASE_URL  - default https://api.openai.com/v1
//                          (e.g. http://localhost:11434/v1 for local Ollama,
//                           https://api.x.ai/v1 for Grok)
//   PROBOT_LLM_MODEL     - default gpt-4o-mini (e.g. llama3.2, grok-4.3)
//   PROBOT_LLM_API_KEY   - your key; not needed for local Ollama (any value)
//
// Running local Ollama here is the fully free, $0 path: the model runs on your
// own machine and no key ever leaves it.
async function callLlm(system: string, userMessage: string): Promise<string> {
  const baseUrl = (
    process.env.PROBOT_LLM_BASE_URL ?? "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model = process.env.PROBOT_LLM_MODEL ?? "gpt-4o-mini";
  // Ollama ignores the key but the OpenAI-compatible header still expects one.
  const apiKey = process.env.PROBOT_LLM_API_KEY ?? "ollama";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    return "Sorry, I couldn't reach the model right now. Please try again.";
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
