export type ProviderName = "anthropic" | "openai" | "google" | "azure" | "grok";

export type CompleteParams = {
  system: string;
  userMessage: string;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
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
