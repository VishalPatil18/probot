import OpenAI, { APIError } from "openai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

// Ollama runs models locally and exposes an OpenAI-compatible API (default
// http://localhost:11434). It needs no API key - any string works - so this is
// the genuinely $0 provider. The creator supplies the base URL (so the server
// running the chat must be able to reach it); the model name is whatever they
// pulled locally (e.g. "llama3.2"), passed through as `params.model`.
const PLACEHOLDER_KEY = "ollama";
const DEFAULT_MODEL = "llama3.2";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

// Turns a user-supplied base URL into the OpenAI-compatible endpoint Ollama
// serves, tolerating a trailing slash or an already-appended `/v1`.
function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export const ollamaProvider: LLMProvider = {
  defaultModel: DEFAULT_MODEL,
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const rawBaseUrl = params.extras?.baseUrl;
    if (!rawBaseUrl) {
      // Same UX bucket as a missing key: the creator's Ollama settings are
      // incomplete, so the chat UI prompts them to recheck their settings.
      throw new ProviderError(
        "ollama",
        "invalid_key",
        "Ollama provider requires a base URL",
      );
    }

    const client = new OpenAI({
      apiKey: params.apiKey || PLACEHOLDER_KEY,
      baseURL: normalizeBaseUrl(rawBaseUrl),
    });

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
          "ollama",
          "unknown",
          "Ollama returned an empty response",
        );
      }
      return { reply: content };
    } catch (err) {
      throw mapOllamaError(err);
    }
  },
};

function mapOllamaError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof APIError) {
    if (err.status === 404) {
      // Usually a model that hasn't been pulled, or a wrong base URL path.
      return new ProviderError(
        "ollama",
        "invalid_key",
        "Ollama model or endpoint not found - is the model pulled?",
      );
    }
    if (err.status === 429) {
      return new ProviderError("ollama", "rate_limit", "Ollama rate limit hit");
    }
  }
  // Connection refused / DNS / timeout: the server couldn't reach Ollama.
  return new ProviderError(
    "ollama",
    "unknown",
    "Could not reach the Ollama server at the configured base URL",
  );
}
