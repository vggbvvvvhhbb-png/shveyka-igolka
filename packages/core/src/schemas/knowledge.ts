// ============================================================================
// ОБЩИЕ ПРИМИТИВЫ
// ============================================================================

export type Slug = string;
export type LocalizedString = string;

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type FabricCategory = "natural" | "synthetic" | "blend";
export type WeightClass = "light" | "medium" | "heavy" | "very_heavy";
export type StretchLevel = "none" | "low" | "medium" | "high";

export type NeedleType =
  | "universal"
  | "ballpoint"
  | "stretch"
  | "jeans"
  | "microtex"
  | "leather"
  | "quilting";

export type NeedleSize =
  | "60/8"
  | "65/9"
  | "70/10"
  | "75/11"
  | "80/12"
  | "90/14"
  | "100/16"
  | "110/18"
  | "120/19";

export type StitchType = "straight" | "zigzag" | "narrow_zigzag" | "buttonhole" | "blind_hem";

// ============================================================================
// НАСТРОЙКИ МАШИНЫ
// ============================================================================

export type MachineSettings = {
  needle_type: NeedleType;
  needle_size: NeedleSize | NeedleSize[];
  thread_weight: string;
  thread_material: "polyester" | "cotton" | "silk" | "reinforced_polyester";
  stitch_type: StitchType;
  stitch_length_mm: [number, number];
  stitch_width_mm?: [number, number];
  top_tension: [number, number];
  presser_foot?: "standard" | "zipper" | "buttonhole" | "teflon" | "walking";
  notes?: LocalizedString;
};

// ============================================================================
// 1. ТКАНЬ
// ============================================================================

export type Fabric = {
  id: Slug;
  name: LocalizedString;
  aliases: LocalizedString[];
  composition: LocalizedString;
  category: FabricCategory;
  weight_class: WeightClass;
  density_min_gsm: number;
  density_max_gsm: number;
  stretch: StretchLevel;
  shrinkage_percent: number;
  requires_decatizing: boolean;
  suitable_for: GarmentType[];
  default_machine_settings: MachineSettings;
  recommended_edge_finish: Slug[];
  difficulty_to_work_with: Difficulty;
  care_instructions: LocalizedString;
  common_issues: LocalizedString[];
  photo_url?: string;
};

// ============================================================================
// 2. ШОВ
// ============================================================================

export type SeamType = "join" | "edge_finish" | "hem" | "decorative" | "closure" | "facing";

export type SeamStep = {
  order: number;
  instruction: LocalizedString;
  tip?: LocalizedString;
};

export type Seam = {
  id: Slug;
  name: LocalizedString;
  aliases: LocalizedString[];
  type: SeamType;
  difficulty: Difficulty;
  suitable_weight_classes: WeightClass[];
  preferred_fabrics?: Slug[];
  when_to_use: LocalizedString;
  default_machine_settings: MachineSettings;
  steps: SeamStep[];
  common_mistakes: LocalizedString[];
  variants?: Array<{
    id: Slug;
    name: LocalizedString;
    difference: LocalizedString;
  }>;
  diagram_url?: string;
};

// ============================================================================
// 3. ПРОЕКТ
// ============================================================================

export type GarmentType =
  | "dress_straight"
  | "blouse_with_sleeves"
  | "skirt_elastic"
  | "skirt_straight"
  | "pants_simple"
  | "curtains"
  | "bedding_set"
  | "pillowcase"
  | "sheet"
  | "duvet_cover";

export type ProjectCategory = "clothing" | "home_textile";

export type ProjectStep = {
  order: number;
  title: LocalizedString;
  description: LocalizedString;
  seam_ref?: Slug;
  estimated_minutes?: number;
  tip?: LocalizedString;
};

export type Project = {
  id: Slug;
  name: LocalizedString;
  category: ProjectCategory;
  garment_type: GarmentType;
  difficulty: Difficulty;
  estimated_time_hours: [number, number];
  required_seams: Slug[];
  recommended_fabrics: Slug[];
  recommended_weight_classes: WeightClass[];
  fabric_amount_formula: LocalizedString;
  seam_allowances: {
    side: number;
    shoulder: number;
    neckline: number;
    armhole: number;
    hem: number;
  };
  materials: {
    main_fabric: LocalizedString;
    notions: LocalizedString[];
  };
  steps: ProjectStep[];
  final_checklist: LocalizedString[];
  pattern_source?: {
    provider: "freesewing" | "burda" | "custom" | "user_upload";
    identifier?: string;
  };
};

// ============================================================================
// ЭКСПОРТ
// ============================================================================

export type KnowledgeBase = {
  fabrics: Fabric[];
  seams: Seam[];
  projects: Project[];
};
