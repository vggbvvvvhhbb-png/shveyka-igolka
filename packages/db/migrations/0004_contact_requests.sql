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
CREATE INDEX IF NOT EXISTS "contact_requests_created_at_idx" ON "contact_requests" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_requests_topic_idx" ON "contact_requests" ("topic");
