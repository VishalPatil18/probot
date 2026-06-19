import { openaiEmbedder } from "./openai";
import type { EmbeddingProvider, EmbeddingProviderName } from "./types";

const EMBEDDERS: Record<EmbeddingProviderName, EmbeddingProvider> = {
  openai: openaiEmbedder,
};

export function getEmbedder(
  name: EmbeddingProviderName = "openai",
): EmbeddingProvider {
  const embedder = EMBEDDERS[name];
  if (!embedder) {
    throw new Error(`Unknown embedding provider: ${name}`);
  }
  return embedder;
}

export { DEFAULT_EMBEDDING_MODEL, DEFAULT_EMBEDDING_DIMENSIONS } from "./openai";
export type {
  EmbeddingProvider,
  EmbeddingProviderName,
  EmbedParams,
  EmbeddingErrorCategory,
} from "./types";
export { EmbeddingError } from "./types";
