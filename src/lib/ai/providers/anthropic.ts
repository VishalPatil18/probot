import Anthropic, { APIError } from "@anthropic-ai/sdk";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

const DEFAULT_MODEL = "claude-haiku-4-5";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

export const anthropicProvider: LLMProvider = {
  defaultModel: DEFAULT_MODEL,
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const client = new Anthropic({ apiKey: params.apiKey });
    try {
      const response = await client.messages.create({
        model: params.model ?? DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? DEFAULT_TEMPERATURE,
        system: params.system,
        messages: [{ role: "user", content: params.userMessage }],
      });
      const first = response.content[0];
      if (!first || first.type !== "text") {
        throw new ProviderError(
          "anthropic",
          "unknown",
          "Anthropic returned a non-text response",
        );
      }
      return { reply: first.text };
    } catch (err) {
      throw mapAnthropicError(err);
    }
  },
};

function mapAnthropicError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof APIError) {
    if (err.status === 401) {
      return new ProviderError(
        "anthropic",
        "invalid_key",
        "Anthropic rejected the API key",
      );
    }
    if (err.status === 429) {
      return new ProviderError(
        "anthropic",
        "rate_limit",
        "Anthropic rate limit hit",
      );
    }
  }
  return new ProviderError("anthropic", "unknown", "Anthropic request failed");
}
