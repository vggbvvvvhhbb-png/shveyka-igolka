CREATE TABLE IF NOT EXISTS "message_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"rating" text NOT NULL,
	"comment" text,
	"context_slugs" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sewn_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"fabric_slug" text,
	"cost" integer NOT NULL,
	"market_price" integer,
	"gift" boolean DEFAULT false NOT NULL,
	"sewn_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "context_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_feedback_message_id_uq" ON "message_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_feedback_rating_idx" ON "message_feedback" USING btree ("rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sewn_items_sewn_at_idx" ON "sewn_items" USING btree ("sewn_at");