import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { getEmbedder } from "@/lib/ai/embeddings";
import type { EmbeddingProvider } from "@/lib/ai/embeddings";

export const DEFAULT_TOP_K = 5;
export const DEFAULT_SIMILARITY_FLOOR = 0.5;

export interface RetrievedChunk {
  contentText: string;
  similarity: number;
  sourceName: string;
  chunkIndex: number;
}

export interface RetrieveOptions {
  topK?: number;
  similarityFloor?: number;
  embedder?: EmbeddingProvider;
}

export interface RetrieveParams {
  botId: string;
  query: string;
  apiKey: string;
  options?: RetrieveOptions;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.map((v) => v.toString()).join(",")}]`;
}

type RetrievalRow = {
  content_text: string;
  source_name: string;
  chunk_index: number;
  similarity: string | number;
  [key: string]: unknown;
};

export async function retrieveRelevant(
  params: RetrieveParams,
): Promise<RetrievedChunk[]> {
  const { botId, query, apiKey, options } = params;
  const topK = options?.topK ?? DEFAULT_TOP_K;
  const similarityFloor = options?.similarityFloor ?? DEFAULT_SIMILARITY_FLOOR;
  const embedder = options?.embedder ?? getEmbedder("openai");

  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const [queryEmbedding] = await embedder.embed({
    texts: [trimmed],
    apiKey,
  });
  if (!queryEmbedding) return [];

  const queryVector = toVectorLiteral(queryEmbedding);

  const result = await db.execute<RetrievalRow>(sql`
    SELECT
      content_text,
      source_name,
      chunk_index,
      1 - (embedding <=> ${queryVector}::vector) AS similarity
    FROM knowledge_base
    WHERE bot_id = ${botId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${queryVector}::vector
    LIMIT ${topK}
  `);

  return result.rows
    .map((row) => ({
      contentText: row.content_text,
      sourceName: row.source_name,
      chunkIndex: row.chunk_index,
      similarity:
        typeof row.similarity === "string"
          ? Number.parseFloat(row.similarity)
          : row.similarity,
    }))
    .filter((row) => row.similarity >= similarityFloor);
}
