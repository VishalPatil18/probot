import type { SendMessage } from "../types";

// Server-side helper. Consumers call this in their own API route (Next.js,
// Express, etc.) to build a `SendMessage` backed by any OpenAI-compatible
// endpoint - OpenAI, Grok, local Ollama, LM Studio, together.ai, etc.
//
// This helper must NOT run in the browser: it holds the API key. The typical
// wiring is a same-origin POST /api/chat handler that invokes this and
// streams the reply back to the ProbotBot component through a client-side
// `sendMessage` shim that calls `/api/chat`.

export interface OpenAIHandlerOptions {
  baseUrl?: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}

export function createOpenAIHandler(opts: OpenAIHandlerOptions): SendMessage {
  const base = (opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const doFetch = opts.fetchImpl ?? fetch;
  return async ({ system, messages, signal }) => {
    const res = await doFetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${opts.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`llm_${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  };
}
