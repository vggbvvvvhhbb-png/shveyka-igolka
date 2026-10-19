CREATE TABLE IF NOT EXISTS "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fabrics" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb NOT NULL,
	"composition" text NOT NULL,
	"category" text NOT NULL,
	"weight_class" text NOT NULL,
	"density_min_gsm" integer NOT NULL,
	"density_max_gsm" integer NOT NULL,
	"stretch" text NOT NULL,
	"shrinkage_percent" integer NOT NULL,
	"requires_decatizing" boolean NOT NULL,
	"suitable_for" jsonb NOT NULL,
	"default_machine_settings" jsonb NOT NULL,
	"recommended_edge_finish" jsonb NOT NULL,
	"difficulty_to_work_with" text NOT NULL,
	"care_instructions" text NOT NULL,
	"common_issues" jsonb NOT NULL,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"bust" integer,
	"waist" integer,
	"hip" integer,
	"height" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"garment_type" text NOT NULL,
	"difficulty" text NOT NULL,
	"estimated_time_hours" jsonb NOT NULL,
	"required_seams" jsonb NOT NULL,
	"recommended_fabrics" jsonb NOT NULL,
	"recommended_weight_classes" jsonb NOT NULL,
	"fabric_amount_formula" text NOT NULL,
	"seam_allowances" jsonb NOT NULL,
	"materials" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"final_checklist" jsonb NOT NULL,
	"pattern_source" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb NOT NULL,
	"type" text NOT NULL,
	"difficulty" text NOT NULL,
	"suitable_weight_classes" jsonb NOT NULL,
	"preferred_fabrics" jsonb,
	"when_to_use" text NOT NULL,
	"default_machine_settings" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"common_mistakes" jsonb NOT NULL,
	"variants" jsonb,
	"diagram_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fabrics_weight_class_idx" ON "fabrics" USING btree ("weight_class");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fabrics_category_idx" ON "fabrics" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fabrics_stretch_idx" ON "fabrics" USING btree ("stretch");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fabrics_suitable_for_idx" ON "fabrics" USING btree ("suitable_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_garment_type_idx" ON "projects" USING btree ("garment_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_difficulty_idx" ON "projects" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_required_seams_idx" ON "projects" USING btree ("required_seams");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seams_type_idx" ON "seams" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seams_difficulty_idx" ON "seams" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seams_suitable_weight_classes_idx" ON "seams" USING btree ("suitable_weight_classes");