ALTER TABLE "messages" ADD COLUMN "follow_ups" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "related" jsonb DEFAULT '[]'::jsonb NOT NULL;