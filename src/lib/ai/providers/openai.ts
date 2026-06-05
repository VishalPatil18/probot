import OpenAI, { APIError } from "openai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

export const openaiProvider: LLMProvider = {
  defaultModel: DEFAULT_MODEL,
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const client = new OpenAI({ apiKey: params.apiKey });
    try {
      const response = await client.chat.completions.create({
        model: params.model ?? DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? DEFAULT_TEMPERATURE,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.userMessage },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (typeof content !== "string" || content.length === 0) {
        throw new ProviderError(
          "openai",
          "unknown",
          "OpenAI returned an empty response",
        );
      }
      return { reply: content };
    } catch (err) {
      throw mapOpenAIError(err);
    }
  },
};

function mapOpenAIError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof APIError) {
    if (err.status === 401) {
      return new ProviderError(
        "openai",
        "invalid_key",
        "OpenAI rejected the API key",
      );
    }
    if (err.status === 429) {
      return new ProviderError(
        "openai",
        "rate_limit",
        "OpenAI rate limit hit",
      );
    }
  }
  return new ProviderError("openai", "unknown", "OpenAI request failed");
}
