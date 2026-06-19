-- Stage 3 RAG: pgvector embeddings on knowledge_base.
-- Requires the pgvector extension. Supabase: available on all plans (free
-- tier included). Run this migration via `drizzle-kit migrate` or apply by
-- hand in the Supabase SQL editor.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "embedding_model" varchar(60);--> statement-breakpoint
-- HNSW index for cosine-distance similarity search. Defaults m=16,
-- ef_construction=64 (pgvector recommended). One global index serves all
-- bots; the `WHERE bot_id = $1` constraint in the chat-time query is a
-- post-filter on the HNSW result set. Drizzle's index() builder does not
-- yet emit pgvector index syntax, so this DDL is hand-written.
CREATE INDEX IF NOT EXISTS "knowledge_base_embedding_hnsw"
  ON "knowledge_base"
  USING hnsw ("embedding" vector_cosine_ops);
