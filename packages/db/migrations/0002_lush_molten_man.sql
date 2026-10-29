ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mode" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;
