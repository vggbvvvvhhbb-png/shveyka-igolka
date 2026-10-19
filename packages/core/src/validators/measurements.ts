import { z } from "zod";

// ============================================================================
// МЕРКИ
// ============================================================================

/**
 * Значение одной мерки в сантиметрах.
 *
 * Диапазон 30–250 покрывает и детские, и взрослые мерки; целое число
 * отсекает ошибочный ввод вроде «92,5 см».
 */
const measurementValueSchema = z
  .number({ invalid_type_error: "Значение должно быть числом" })
  .int("Значение должно быть целым числом")
  .min(30, "Минимальное значение — 30 см")
  .max(250, "Максимальное значение — 250 см");

/**
 * Мерки пользователя. Все поля опциональны: пользователь может заполнить
 * только те, которые знает.
 */
export const MeasurementsSchema = z.object({
  bust: measurementValueSchema.optional(),
  waist: measurementValueSchema.optional(),
  hip: measurementValueSchema.optional(),
  height: measurementValueSchema.optional(),
});

export type MeasurementsInput = z.infer<typeof MeasurementsSchema>;
