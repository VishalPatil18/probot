ALTER TABLE "encrypted_llm_keys" ADD COLUMN "azure_endpoint" text;--> statement-breakpoint
ALTER TABLE "encrypted_llm_keys" ADD COLUMN "azure_api_version" varchar(64);