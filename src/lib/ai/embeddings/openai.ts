import OpenAI, { APIError } from "openai";

import type { EmbedParams, EmbeddingProvider } from "./types";
import { EmbeddingError } from "./types";

// `text-embedding-3-large` truncated to 1536 dims via the API's `dimensions`
// parameter (Matryoshka representation). Per OpenAI's MTEB benchmark, this
// scores ~63.3 vs the same model at full 3072 dims (~64.6) and beats
// `text-embedding-3-small` at 1536 dims (~62.3). Cuts pgvector column storage
// and HNSW build cost in half versus the full-dim variant.
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-large";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

// OpenAI's embeddings API accepts up to 2048 inputs per request. We stay well
// below that for predictable latency and to keep memory bounded.
const BATCH_SIZE = 96;

export const openaiEmbedder: EmbeddingProvider = {
  name: "openai",
  model: DEFAULT_EMBEDDING_MODEL,
  dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
  async embed(params: EmbedParams): Promise<number[][]> {
    if (params.texts.length === 0) {
      throw new EmbeddingError(
        "openai",
        "empty_input",
        "embed() called with no texts",
      );
    }

    const client = new OpenAI({ apiKey: params.apiKey });
    const result: number[][] = [];

    for (let i = 0; i < params.texts.length; i += BATCH_SIZE) {
      const batch = params.texts.slice(i, i + BATCH_SIZE);
      try {
        const response = await client.embeddings.create({
          model: DEFAULT_EMBEDDING_MODEL,
          dimensions: DEFAULT_EMBEDDING_DIMENSIONS,
          input: batch,
        });
        if (response.data.length !== batch.length) {
          throw new EmbeddingError(
            "openai",
            "unknown",
            "OpenAI returned fewer embeddings than inputs",
          );
        }
        for (const item of response.data) {
          if (item.embedding.length !== DEFAULT_EMBEDDING_DIMENSIONS) {
            throw new EmbeddingError(
              "openai",
              "dimension_mismatch",
              `Expected ${DEFAULT_EMBEDDING_DIMENSIONS}-dim vector, got ${item.embedding.length}`,
            );
          }
          result.push(item.embedding);
        }
      } catch (err) {
        throw mapOpenAIEmbeddingError(err);
      }
    }

    return result;
  },
};

function mapOpenAIEmbeddingError(err: unknown): EmbeddingError {
  if (err instanceof EmbeddingError) return err;
  if (err instanceof APIError) {
    if (err.status === 401) {
      return new EmbeddingError(
        "openai",
        "invalid_key",
        "OpenAI rejected the API key",
      );
    }
    if (err.status === 429) {
      return new EmbeddingError(
        "openai",
        "rate_limit",
        "OpenAI rate limit hit",
      );
    }
  }
  return new EmbeddingError("openai", "unknown", "OpenAI embed request failed");
}
