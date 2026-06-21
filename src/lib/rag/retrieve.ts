import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { getEmbedder } from "@/lib/ai/embeddings";
import type { EmbeddingProvider } from "@/lib/ai/embeddings";

// Retrieval defaults. Top-5 with a cosine similarity floor of 0.5
// - below this, results are treated as irrelevant and the chat route falls
// back to `bots.context_text` (full-context path). Matches the
// blueprint locked in claude/plan.md §3.
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

// Format a JS number[] as a pgvector literal string. pgvector accepts
// '[0.1,0.2,...]'::vector - node-postgres binds the string as $N then the
// SQL cast converts it. We do NOT use exponential notation; pgvector parses
// fixed-decimal more reliably across versions.
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

// Embeds the query, runs a top-K cosine-similarity search over the bot's
// chunks, filters to results above the similarity floor, and returns them in
// descending-similarity order. Returns [] when no chunks for the bot have
// embeddings (e.g. older bots) - the caller treats this as a signal to
// fall back to the legacy full-context path.
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

  // Raw SQL because Drizzle's query builder does not expose pgvector's `<=>`
  // cosine-distance operator. The vector literal is bound as a parameter to
  // dodge any chance of SQL injection through the numeric serializer; the
  // `::vector` cast is applied server-side.
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

  // drizzle's node-postgres adapter returns numeric columns as strings when
  // the type is computed (1 - distance) rather than a column. Coerce to
  // number once at the boundary.
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
