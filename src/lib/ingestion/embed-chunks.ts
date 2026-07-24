import { and, eq, isNull, sql } from "drizzle-orm";

import {
  DEFAULT_EMBEDDING_MODEL,
  type EmbeddingProvider,
  getEmbedder,
} from "@/lib/ai/embeddings";
import { db, knowledgeBase } from "@/lib/db";

export interface EmbedChunksResult {
  embedded: number;
  skipped: number;
}

export interface EmbedChunksParams {
  botId: string;
  sourceName: string;
  apiKey: string;
  embedder?: EmbeddingProvider;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.map((v) => v.toString()).join(",")}]`;
}

export async function embedChunks(
  params: EmbedChunksParams,
): Promise<EmbedChunksResult> {
  const embedder = params.embedder ?? getEmbedder("openai");

  const rows = await db
    .select({
      id: knowledgeBase.id,
      contentText: knowledgeBase.contentText,
    })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.botId, params.botId),
        eq(knowledgeBase.sourceName, params.sourceName),
        isNull(knowledgeBase.embedding),
      ),
    );

  if (rows.length === 0) {
    return { embedded: 0, skipped: 0 };
  }

  const vectors = await embedder.embed({
    texts: rows.map((r) => r.contentText),
    apiKey: params.apiKey,
  });

  if (vectors.length !== rows.length) {
    throw new Error(
      `embedder returned ${vectors.length} vectors for ${rows.length} chunks`,
    );
  }

  let embedded = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const vector = vectors[i];
    if (!row || !vector) continue;
    const literal = toVectorLiteral(vector);
    await db
      .update(knowledgeBase)
      .set({
        embedding: sql`${literal}::vector`,
        embeddingModel: embedder.model ?? DEFAULT_EMBEDDING_MODEL,
      })
      .where(eq(knowledgeBase.id, row.id));
    embedded += 1;
  }

  return { embedded, skipped: 0 };
}
