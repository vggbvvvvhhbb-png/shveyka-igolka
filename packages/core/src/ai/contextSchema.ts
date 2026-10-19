import { z } from "zod";
import { BodyMeasurementsSchema } from "./measurements";

// Поля, которые реально нужны модели. Полные записи в промпт не передаются.

export const FabricContextSchema = z.object({
  slug: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  category: z.string(),
  weight_class: z.string(),
  stretch: z.string(),
  suitable_for: z.array(z.string()),
  default_machine_settings: z.record(z.string(), z.unknown()),
  care_instructions: z.string(),
  common_issues: z.array(z.string()),
});

export const SeamContextSchema = z.object({
  slug: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  type: z.string(),
  difficulty: z.string(),
  suitable_weight_classes: z.array(z.string()),
  when_to_use: z.string(),
  default_machine_settings: z.record(z.string(), z.unknown()),
  steps: z.array(
    z.object({ order: z.number(), instruction: z.string(), tip: z.string().optional() })
  ),
  common_mistakes: z.array(z.string()),
});

export const ProjectContextSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  garment_type: z.string(),
  difficulty: z.string(),
  estimated_time_hours: z.tuple([z.number(), z.number()]),
  fabric_amount_formula: z.string(),
  required_seams: z.array(z.string()),
  final_checklist: z.array(z.string()),
  // Подсказка по размеру изделия, посчитанная из мерок пользователя.
  // Появляется только если мерки есть и для этого проекта есть правило.
  size_hint: z.string().optional(),
});

export const AssistantContextSchema = z.object({
  fabrics: z.array(FabricContextSchema).max(8),
  seams: z.array(SeamContextSchema).max(8),
  projects: z.array(ProjectContextSchema).max(8),
  // Мерки пользователя. Блок появляется, только если мерки заполнены.
  measurements: BodyMeasurementsSchema.optional(),
});

export type AssistantContext = z.infer<typeof AssistantContextSchema>;
