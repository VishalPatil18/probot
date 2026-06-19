CREATE TABLE IF NOT EXISTS "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_id" uuid NOT NULL,
	"source_type" varchar(10) NOT NULL,
	"source_name" varchar(255) NOT NULL,
	"content_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"token_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_base" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "context_token_cap" integer DEFAULT 12000 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_base_bot_id_idx" ON "knowledge_base" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_base_bot_source_idx" ON "knowledge_base" USING btree ("bot_id","source_name");