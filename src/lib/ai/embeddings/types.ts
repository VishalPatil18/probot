export type EmbeddingProviderName = "openai";

export interface EmbedParams {
  texts: string[];
  apiKey: string;
}

export interface EmbeddingProvider {
  readonly name: EmbeddingProviderName;
  readonly model: string;
  readonly dimensions: number;
  embed(params: EmbedParams): Promise<number[][]>;
}

export type EmbeddingErrorCategory =
  | "invalid_key"
  | "rate_limit"
  | "dimension_mismatch"
  | "empty_input"
  | "unknown";

export class EmbeddingError extends Error {
  readonly provider: EmbeddingProviderName;
  readonly category: EmbeddingErrorCategory;

  constructor(
    provider: EmbeddingProviderName,
    category: EmbeddingErrorCategory,
    message: string,
  ) {
    super(message);
    this.name = "EmbeddingError";
    this.provider = provider;
    this.category = category;
  }

  toJSON(): {
    name: string;
    provider: EmbeddingProviderName;
    category: EmbeddingErrorCategory;
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
