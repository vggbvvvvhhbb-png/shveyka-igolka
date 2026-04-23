import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const DifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);
export const FabricCategorySchema = z.enum(["natural", "synthetic", "blend"]);
export const WeightClassSchema = z.enum(["light", "medium", "heavy", "very_heavy"]);
export const StretchLevelSchema = z.enum(["none", "low", "medium", "high"]);

export const NeedleTypeSchema = z.enum([
  "universal",
  "ballpoint",
  "stretch",
  "jeans",
  "microtex",
  "leather",
  "quilting",
]);

export const NeedleSizeSchema = z.enum([
  "60/8",
  "65/9",
  "70/10",
  "75/11",
  "80/12",
  "90/14",
  "100/16",
  "110/18",
  "120/19",
]);

export const StitchTypeSchema = z.enum([
  "straight",
  "zigzag",
  "narrow_zigzag",
  "buttonhole",
  "blind_hem",
]);

export const SeamTypeSchema = z.enum([
  "join",
  "edge_finish",
  "hem",
  "decorative",
  "closure",
  "facing",
]);

export const GarmentTypeSchema = z.enum([
  "dress_straight",
  "blouse_with_sleeves",
  "skirt_elastic",
  "skirt_straight",
  "pants_simple",
  "curtains",
  "bedding_set",
  "pillowcase",
  "sheet",
  "duvet_cover",
]);

export const ProjectCategorySchema = z.enum(["clothing", "home_textile"]);

export const PatternProviderSchema = z.enum(["freesewing", "burda", "custom", "user_upload"]);

// ============================================================================
// PRIMITIVES
// ============================================================================

export const SlugSchema = z.string();
export const LocalizedStringSchema = z.string();
export const NumberTupleSchema = z.tuple([z.number(), z.number()]);

// ============================================================================
// MACHINE SETTINGS
// ============================================================================

export const MachineSettingsSchema = z.object({
  needle_type: NeedleTypeSchema,
  needle_size: z.union([NeedleSizeSchema, z.array(NeedleSizeSchema)]),
  thread_weight: z.string(),
  thread_material: z.enum(["polyester", "cotton", "silk", "reinforced_polyester"]),
  stitch_type: StitchTypeSchema,
  stitch_length_mm: NumberTupleSchema,
  stitch_width_mm: NumberTupleSchema.optional(),
  top_tension: NumberTupleSchema,
  presser_foot: z.enum(["standard", "zipper", "buttonhole", "teflon", "walking"]).optional(),
  notes: LocalizedStringSchema.optional(),
});

// ============================================================================
// FABRIC
// ============================================================================

export const FabricSchema = z.object({
  id: SlugSchema,
  name: LocalizedStringSchema,
  aliases: z.array(LocalizedStringSchema),
  composition: LocalizedStringSchema,
  category: FabricCategorySchema,
  weight_class: WeightClassSchema,
  density_min_gsm: z.number(),
  density_max_gsm: z.number(),
  stretch: StretchLevelSchema,
  shrinkage_percent: z.number(),
  requires_decatizing: z.boolean(),
  suitable_for: z.array(GarmentTypeSchema),
  default_machine_settings: MachineSettingsSchema,
  recommended_edge_finish: z.array(SlugSchema),
  difficulty_to_work_with: DifficultySchema,
  care_instructions: LocalizedStringSchema,
  common_issues: z.array(LocalizedStringSchema),
  photo_url: z.string().optional(),
});

// ============================================================================
// SEAM
// ============================================================================

export const SeamStepSchema = z.object({
  order: z.number(),
  instruction: LocalizedStringSchema,
  tip: LocalizedStringSchema.optional(),
});

export const SeamVariantSchema = z.object({
  id: SlugSchema,
  name: LocalizedStringSchema,
  difference: LocalizedStringSchema,
});

export const SeamSchema = z.object({
  id: SlugSchema,
  name: LocalizedStringSchema,
  aliases: z.array(LocalizedStringSchema),
  type: SeamTypeSchema,
  difficulty: DifficultySchema,
  suitable_weight_classes: z.array(WeightClassSchema),
  preferred_fabrics: z.array(SlugSchema).optional(),
  when_to_use: LocalizedStringSchema,
  default_machine_settings: MachineSettingsSchema,
  steps: z.array(SeamStepSchema),
  common_mistakes: z.array(LocalizedStringSchema),
  variants: z.array(SeamVariantSchema).optional(),
  diagram_url: z.string().optional(),
});

// ============================================================================
// PROJECT
// ============================================================================

export const ProjectStepSchema = z.object({
  order: z.number(),
  title: LocalizedStringSchema,
  description: LocalizedStringSchema,
  seam_ref: SlugSchema.optional(),
  estimated_minutes: z.number().optional(),
  tip: LocalizedStringSchema.optional(),
});

export const SeamAllowancesSchema = z.object({
  side: z.number(),
  shoulder: z.number(),
  neckline: z.number(),
  armhole: z.number(),
  hem: z.number(),
});

export const MaterialsSchema = z.object({
  main_fabric: LocalizedStringSchema,
  notions: z.array(LocalizedStringSchema),
});

export const PatternSourceSchema = z.object({
  provider: PatternProviderSchema,
  identifier: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: SlugSchema,
  name: LocalizedStringSchema,
  category: ProjectCategorySchema,
  garment_type: GarmentTypeSchema,
  difficulty: DifficultySchema,
  estimated_time_hours: NumberTupleSchema,
  required_seams: z.array(SlugSchema),
  recommended_fabrics: z.array(SlugSchema),
  recommended_weight_classes: z.array(WeightClassSchema),
  fabric_amount_formula: LocalizedStringSchema,
  seam_allowances: SeamAllowancesSchema,
  materials: MaterialsSchema,
  steps: z.array(ProjectStepSchema),
  final_checklist: z.array(LocalizedStringSchema),
  pattern_source: PatternSourceSchema.optional(),
});

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

export const KnowledgeBaseSchema = z.object({
  fabrics: z.array(FabricSchema),
  seams: z.array(SeamSchema),
  projects: z.array(ProjectSchema),
});
