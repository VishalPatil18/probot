import Anthropic from "@anthropic-ai/sdk";

import type { SendMessage } from "../types";

// Server-side helper. Consumers call this in their own API route (Next.js,
// Express, etc.) to build a `SendMessage` backed by the Anthropic Claude
// API. Same shape as `createOpenAIHandler` / `createGoogleHandler` so
// swapping providers is a one-line change.
//
// This helper must NOT run in the browser: it holds the API key. The
// typical wiring is a same-origin POST /api/chat handler that invokes
// this and returns the reply to the ProbotBot component's
// `sendMessage` shim.

export interface AnthropicHandlerOptions {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  // Optional override for proxying, testing, or Vertex/Bedrock relays.
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function createAnthropicHandler(
  opts: AnthropicHandlerOptions,
): SendMessage {
  return async ({ system, messages, signal }) => {
    const client = new Anthropic({
      apiKey: opts.apiKey,
      ...(opts.baseUrl ? { baseURL: opts.baseUrl } : {}),
      ...(opts.fetchImpl ? { fetch: opts.fetchImpl } : {}),
    });
    const res = await client.messages.create(
      {
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      signal ? { signal } : {},
    );
    const first = res.content[0];
    if (!first || first.type !== "text") {
      throw new Error("anthropic_non_text");
    }
    return first.text;
  };
}
