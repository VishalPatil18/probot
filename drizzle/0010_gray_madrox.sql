ALTER TABLE "bots" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "custom_instructions" text;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "preview_token" text;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "rate_limit_per_minute" integer;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "rate_limit_per_day" integer;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "rate_limit_max_chars" integer;