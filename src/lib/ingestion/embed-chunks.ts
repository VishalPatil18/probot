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

// Format a JS number[] as a pgvector literal string.
// Matches `src/lib/rag/retrieve.ts#toVectorLiteral`. Kept local to avoid a
// circular dependency between the ingestion and rag modules.
function toVectorLiteral(values: number[]): string {
  return `[${values.map((v) => v.toString()).join(",")}]`;
}

// Embeds every chunk under (botId, sourceName) that currently has no
// embedding and UPDATEs the rows in place. Idempotent: re-running on a fully
// embedded source skips everything. Throws if the embedder throws — the
// caller decides whether to surface the error (route handler logs + falls
// back to the legacy full-context path).
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
