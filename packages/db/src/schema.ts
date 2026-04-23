import { pgTable, text, jsonb, timestamp, index, integer, boolean } from "drizzle-orm/pg-core";

// ============================================================================
// FABRICS
// ============================================================================

export const fabrics = pgTable(
  "fabrics",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull(),
    composition: text("composition").notNull(),
    category: text("category").notNull(),
    weight_class: text("weight_class").notNull(),
    density_min_gsm: integer("density_min_gsm").notNull(),
    density_max_gsm: integer("density_max_gsm").notNull(),
    stretch: text("stretch").notNull(),
    shrinkage_percent: integer("shrinkage_percent").notNull(),
    requires_decatizing: boolean("requires_decatizing").notNull(),
    suitable_for: jsonb("suitable_for").$type<string[]>().notNull(),
    default_machine_settings: jsonb("default_machine_settings").notNull(),
    recommended_edge_finish: jsonb("recommended_edge_finish").$type<string[]>().notNull(),
    difficulty_to_work_with: text("difficulty_to_work_with").notNull(),
    care_instructions: text("care_instructions").notNull(),
    common_issues: jsonb("common_issues").$type<string[]>().notNull(),
    photo_url: text("photo_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("fabrics_weight_class_idx").on(table.weight_class),
    index("fabrics_category_idx").on(table.category),
    index("fabrics_stretch_idx").on(table.stretch),
    index("fabrics_suitable_for_idx").on(table.suitable_for),
  ]
);

// ============================================================================
// SEAMS
// ============================================================================

export const seams = pgTable(
  "seams",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull(),
    type: text("type").notNull(),
    difficulty: text("difficulty").notNull(),
    suitable_weight_classes: jsonb("suitable_weight_classes").$type<string[]>().notNull(),
    preferred_fabrics: jsonb("preferred_fabrics").$type<string[]>(),
    when_to_use: text("when_to_use").notNull(),
    default_machine_settings: jsonb("default_machine_settings").notNull(),
    steps: jsonb("steps").notNull(),
    common_mistakes: jsonb("common_mistakes").$type<string[]>().notNull(),
    variants: jsonb("variants"),
    diagram_url: text("diagram_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("seams_type_idx").on(table.type),
    index("seams_difficulty_idx").on(table.difficulty),
    index("seams_suitable_weight_classes_idx").on(table.suitable_weight_classes),
  ]
);

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    garment_type: text("garment_type").notNull(),
    difficulty: text("difficulty").notNull(),
    estimated_time_hours: jsonb("estimated_time_hours").notNull(),
    required_seams: jsonb("required_seams").$type<string[]>().notNull(),
    recommended_fabrics: jsonb("recommended_fabrics").$type<string[]>().notNull(),
    recommended_weight_classes: jsonb("recommended_weight_classes").$type<string[]>().notNull(),
    fabric_amount_formula: text("fabric_amount_formula").notNull(),
    seam_allowances: jsonb("seam_allowances").notNull(),
    materials: jsonb("materials").notNull(),
    steps: jsonb("steps").notNull(),
    final_checklist: jsonb("final_checklist").$type<string[]>().notNull(),
    pattern_source: jsonb("pattern_source"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("projects_garment_type_idx").on(table.garment_type),
    index("projects_difficulty_idx").on(table.difficulty),
    index("projects_required_seams_idx").on(table.required_seams),
  ]
);
