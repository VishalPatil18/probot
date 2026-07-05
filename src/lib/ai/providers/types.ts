export type ProviderName =
  | "anthropic"
  | "openai"
  | "google"
  | "azure"
  | "grok"
  | "ollama";

export type CompleteParams = {
  system: string;
  userMessage: string;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  // Per-provider auxiliary fields. Azure uses `endpoint` and `apiVersion`;
  // other providers ignore. Kept as a generic Record so a new provider with
  // extra config (e.g. base URL, region) doesn't require widening the type.
  extras?: Record<string, string>;
};

export type CompleteResult = {
  reply: string;
};

export interface LLMProvider {
  readonly defaultModel: string;
  complete(params: CompleteParams): Promise<CompleteResult>;
}

export type ProviderErrorCategory = "invalid_key" | "rate_limit" | "unknown";

export class ProviderError extends Error {
  readonly provider: ProviderName;
  readonly category: ProviderErrorCategory;

  constructor(
    provider: ProviderName,
    category: ProviderErrorCategory,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.category = category;
  }

  // Bounds the serialized shape so a structured logger (Sentry, pino) cannot
  // pull in an attached SDK error whose headers may carry the raw API key.
  toJSON(): {
    name: string;
    provider: ProviderName;
    category: ProviderErrorCategory;
    message: string;
  } {
    return {
      name: this.name,
      provider: this.provider,
      category: this.category,
      message: this.message,
    };
  }
}
