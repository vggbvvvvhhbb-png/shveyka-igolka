CREATE TABLE IF NOT EXISTS "ai_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_key" text NOT NULL,
	"user_label" text,
	"source" text NOT NULL,
	"feature" text NOT NULL,
	"mode" text,
	"model" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated" boolean DEFAULT false NOT NULL,
	"cached" boolean DEFAULT false NOT NULL,
	"conversation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"name" text,
	"contact" text,
	"message" text NOT NULL,
	"page" text,
	"emailed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_user_key_idx" ON "ai_usage" USING btree ("user_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_feature_idx" ON "ai_usage" USING btree ("feature");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_requests_created_at_idx" ON "contact_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_requests_topic_idx" ON "contact_requests" USING btree ("topic");