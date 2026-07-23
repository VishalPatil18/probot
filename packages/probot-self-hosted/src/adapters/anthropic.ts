import Anthropic from "@anthropic-ai/sdk";

import type { SendMessage } from "../types";

export interface AnthropicHandlerOptions {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
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
