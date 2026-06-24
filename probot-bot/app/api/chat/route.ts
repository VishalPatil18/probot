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

// Minimal OpenAI-compatible chat call using the operator's own key. Replace
// with Anthropic / Gemini / Azure as needed.
async function callLlm(system: string, userMessage: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
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
