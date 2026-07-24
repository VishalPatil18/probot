import OpenAI, { APIError } from "openai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

const BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-4.3";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

export const grokProvider: LLMProvider = {
  defaultModel: DEFAULT_MODEL,
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const client = new OpenAI({ apiKey: params.apiKey, baseURL: BASE_URL });
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
        throw new ProviderError("grok", "unknown", "Grok returned an empty response");
      }
      return { reply: content };
    } catch (err) {
      throw mapGrokError(err);
    }
  },
};

function mapGrokError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof APIError) {
    if (err.status === 401 || err.status === 403) {
      return new ProviderError("grok", "invalid_key", "Grok rejected the API key");
    }
    if (err.status === 429) {
      return new ProviderError("grok", "rate_limit", "Grok rate limit hit");
    }
  }
  return new ProviderError("grok", "unknown", "Grok request failed");
}
