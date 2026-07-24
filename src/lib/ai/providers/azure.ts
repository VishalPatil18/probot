import { APIError, AzureOpenAI } from "openai";

import type { CompleteParams, CompleteResult, LLMProvider } from "./types";
import { ProviderError } from "./types";

const DEFAULT_API_VERSION = "2025-01-01-preview";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3;

export const azureProvider: LLMProvider = {
  defaultModel: "gpt-4o-mini",
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const endpoint = params.extras?.endpoint;
    const apiVersion = params.extras?.apiVersion ?? DEFAULT_API_VERSION;
    const deployment = params.model;

    if (!endpoint || !deployment) {
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
      return new ProviderError(
        "azure",
        "invalid_key",
        "Azure deployment or endpoint not found",
      );
    }
  }
  return new ProviderError("azure", "unknown", "Azure request failed");
}
