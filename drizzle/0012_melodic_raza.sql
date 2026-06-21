CREATE TABLE IF NOT EXISTS "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_snapshot" varchar(255) NOT NULL,
	"username_snapshot" varchar(30) NOT NULL,
	"confirmation_username" varchar(30) NOT NULL,
	"undo_token_hash" varchar(64) NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_purge_at" timestamp NOT NULL,
	"purged_at" timestamp,
	"completion_email_sent_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "deletion_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deletion_requests_user_id_unique" ON "deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deletion_requests_undo_token_hash_unique" ON "deletion_requests" USING btree ("undo_token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deletion_requests_scheduled_purge_at_idx" ON "deletion_requests" USING btree ("scheduled_purge_at");