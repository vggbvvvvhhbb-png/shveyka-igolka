import { z } from "zod";

// ============================================================================
// МЕРКИ В КОНТЕКСТЕ АССИСТЕНТА
// ============================================================================

/**
 * Мерки пользователя в сантиметрах.
 *
 * Здесь границы не проверяются: это уже проверенные данные, пришедшие из БД.
 * Проверка ввода живёт в validators/measurements.ts.
 */
export const BodyMeasurementsSchema = z.object({
  bust: z.number().optional(),
  waist: z.number().optional(),
  hip: z.number().optional(),
  height: z.number().optional(),
});

export type BodyMeasurements = z.infer<typeof BodyMeasurementsSchema>;

/**
 * Правила вывода размеров изделия из мерок.
 *
 * Ключ — тип изделия (garment_type), значение — функция, которая возвращает
 * подсказку на русском или null, если мерок не хватает.
 *
 * Правила взяты из шагов самих проектов, а не придуманы: у юбки на резинке
 * в первом шаге прямо сказано «ширина = (обхват бёдер / 2) + 10 см на свободу».
 * Для остальных проектов размеры изделия из мерок не выводятся — там подсказки
 * нет, и ассистент опирается на рекомендации проекта.
 */
const SIZE_RULES: Record<string, (m: BodyMeasurements) => string | null> = {
  skirt_elastic: (m) =>
    m.hip === undefined
      ? null
      : `ширина полотна = (обхват бёдер ${m.hip} / 2) + 10 см на свободу = ${
          Math.round(m.hip / 2) + 10
        } см`,
};

/**
 * Подсказка по размеру изделия для конкретного проекта.
 * Возвращает null, если для этого типа изделия правила нет или не хватает мерок.
 */
export function buildSizeHint(garmentType: string, measurements: BodyMeasurements): string | null {
  const rule = SIZE_RULES[garmentType];
  return rule ? rule(measurements) : null;
}

/** Названия мерок для блока контекста — в том порядке, в котором их видно в форме. */
const MEASUREMENT_LABELS: Array<{ key: keyof BodyMeasurements; label: string }> = [
  { key: "bust", label: "обхват груди" },
  { key: "waist", label: "обхват талии" },
  { key: "hip", label: "обхват бёдер" },
  { key: "height", label: "рост" },
];

/**
 * Мерки одной строкой для системного промпта: «обхват талии — 74 см, рост — 168 см».
 * Пустые значения не упоминаются.
 */
export function formatMeasurements(measurements: BodyMeasurements): string {
  const parts = MEASUREMENT_LABELS.filter(({ key }) => measurements[key] !== undefined).map(
    ({ key, label }) => `${label} — ${measurements[key]} см`
  );
  return parts.join(", ");
}

/** Есть ли хотя бы одна заполненная мерка. */
export function hasMeasurements(measurements: BodyMeasurements | undefined): boolean {
  if (!measurements) return false;
  return MEASUREMENT_LABELS.some(({ key }) => measurements[key] !== undefined);
}
