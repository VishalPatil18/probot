import { GoogleGenerativeAI } from "@google/generative-ai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

// Stage 7 Phase 4: real Google Gemini adapter (replaces the Stage 1 stub).
//
// The `@google/generative-ai` SDK doesn't ship a typed error class we can
// instanceof-check (everything is `Error` with a `message` describing the
// HTTP status). We map by parsing the message for "API key not valid" /
// "PERMISSION_DENIED" / "429" rather than the cleaner status check
// available on Anthropic/OpenAI. Brittle but the SDK is what it is.
//
// Free-tier model defaults: `gemini-2.5-flash` lives on the free quota and
// is what the bot-factory dropdown shows first. Older `gemini-1.5-flash`
// is accepted for back-compat with bots that were configured before this
// adapter shipped.

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

export const googleProvider: LLMProvider = {
  defaultModel: DEFAULT_MODEL,
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const client = new GoogleGenerativeAI(params.apiKey);
    const model = client.getGenerativeModel({
      model: params.model ?? DEFAULT_MODEL,
      // Gemini's "system" instruction lives at model-config level, not in
      // the messages array. The Anthropic/OpenAI adapters take it as a
      // top-level CompleteParam too so the LLMProvider interface stays
      // provider-agnostic; here we plumb it through.
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
  // Auth failure surface from the SDK: "API key not valid" or
  // "PERMISSION_DENIED" or HTTP 400 with an `errors[0].reason === "API_KEY_INVALID"`.
  // We match the prose form because the SDK doesn't expose a structured code.
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
