import { APIError, AzureOpenAI } from "openai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

const DEFAULT_API_VERSION = "2025-01-01-preview";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

// Azure OpenAI requires three runtime values beyond the API key:
//   - endpoint: e.g. https://<resource>.cognitiveservices.azure.com
//   - deployment: the deployment name (also used as `model` at request time)
//   - apiVersion: e.g. 2025-01-01-preview
//
// `params.model` carries the deployment name; the route resolves it from
// `users.llmModel` (Q1=a). `extras.endpoint` and `extras.apiVersion` come
// from the chat request's custom headers (Task 1.5 key-transport extension).

export const azureProvider: LLMProvider = {
  // `defaultModel` is a placeholder; for Azure the user MUST supply their
  // deployment name in the bot factory. We never call this default at runtime.
  defaultModel: "gpt-4o-mini",
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const endpoint = params.extras?.endpoint;
    const apiVersion = params.extras?.apiVersion ?? DEFAULT_API_VERSION;
    const deployment = params.model;

    if (!endpoint || !deployment) {
      // Caller didn't supply the Azure-specific config. Treat as a key issue
      // (same UX bucket as a missing API key - both fail the same way in
      // the chat UI: "your Azure setup is incomplete; check your settings").
      throw new ProviderError(
        "azure",
        "invalid_key",
        "Azure provider requires endpoint and deployment",
      );
    }

    const client = new AzureOpenAI({
      apiKey: params.apiKey,
      endpoint,
      deployment,
      apiVersion,
    });

    try {
      const response = await client.chat.completions.create({
        model: deployment,
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
          "azure",
          "unknown",
          "Azure OpenAI returned an empty response",
        );
      }
      return { reply: content };
    } catch (err) {
      throw mapAzureError(err);
    }
  },
};

function mapAzureError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof APIError) {
    if (err.status === 401 || err.status === 403) {
      return new ProviderError(
        "azure",
        "invalid_key",
        "Azure rejected the API key",
      );
    }
    if (err.status === 429) {
      return new ProviderError("azure", "rate_limit", "Azure rate limit hit");
    }
    if (err.status === 404) {
      // 404 from Azure usually means a wrong deployment name or endpoint -
      // surface as invalid_key so the UI prompts the user to recheck settings.
      return new ProviderError(
        "azure",
        "invalid_key",
        "Azure deployment or endpoint not found",
      );
    }
  }
  return new ProviderError("azure", "unknown", "Azure request failed");
}
