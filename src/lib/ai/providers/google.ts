import { GoogleGenerativeAI } from "@google/generative-ai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

export const googleProvider: LLMProvider = {
  defaultModel: DEFAULT_MODEL,
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const client = new GoogleGenerativeAI(params.apiKey);
    const model = client.getGenerativeModel({
      model: params.model ?? DEFAULT_MODEL,
      systemInstruction: params.system,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? DEFAULT_TEMPERATURE,
      },
    });

    try {
      const response = await model.generateContent(params.userMessage);
      const text = response.response.text();
      if (typeof text !== "string" || text.length === 0) {
        throw new ProviderError(
          "google",
          "unknown",
          "Google Gemini returned an empty response",
        );
      }
      return { reply: text };
    } catch (err) {
      throw mapGoogleError(err);
    }
  },
};

function mapGoogleError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  const message = err instanceof Error ? err.message : "";
  if (
    /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(
      message,
    )
  ) {
    return new ProviderError(
      "google",
      "invalid_key",
      "Google Gemini rejected the API key",
    );
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new ProviderError(
      "google",
      "rate_limit",
      "Google Gemini rate limit / quota hit",
    );
  }
  return new ProviderError(
    "google",
    "unknown",
    "Google Gemini request failed",
  );
}
