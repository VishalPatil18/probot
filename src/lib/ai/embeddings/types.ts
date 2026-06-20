// Embedding provider abstraction. Kept separate from `LLMProvider` because
// embedding and completion are independent capabilities - not every chat
// provider exposes a native embeddings endpoint (e.g. Anthropic redirects to
// Voyage AI, a paid third-party service). Stage 3 ships OpenAI-only; the
// interface leaves room for `google` (text-embedding-004 @ 768d) later.

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

  // Bounds the serialized shape so a structured logger cannot pull in an
  // attached SDK error whose headers may carry the raw API key. Mirrors
  // ProviderError.toJSON() (see src/lib/ai/providers/types.ts).
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
