/**
 * Расчёт раскроя: сколько метров ткани брать и какая ширина рулона выгоднее.
 *
 * Нормы расхода примерные: заданы для ширины 140 см, размера 48 и припуска
 * 1,5 см. Парные детали (перед/спинка, два рукава) уже учтены в норме.
 *
 * Модуль чистый: без React и без БД — его переиспользует и сайт, и бот.
 */

/** Тип изделия, для которого считается раскрой. */
export type GarmentType = "dress" | "skirt" | "pants" | "shirt" | "jacket" | "coat";

/** Направление раскроя относительно нити основы. */
export type CutDirection = "lengthwise" | "crosswise";

/** Особенности рисунка или ворса, из-за которых расход растёт. */
export type PatternType = "none" | "nap" | "check";

export const GARMENT_LABELS: Record<GarmentType, string> = {
  dress: "Платье",
  skirt: "Юбка",
  pants: "Брюки",
  shirt: "Рубашка",
  jacket: "Пиджак",
  coat: "Пальто",
};

export const CUT_DIRECTION_LABELS: Record<CutDirection, string> = {
  lengthwise: "По долевой",
  crosswise: "По поперечной",
};

export const PATTERN_LABELS: Record<PatternType, string> = {
  none: "Однотонная, без ворса",
  check: "Клетка / полоска (+15%)",
  nap: "Ворс (+10%)",
};

/** Типовые ширины рулона в сантиметрах. */
export const ROLL_WIDTHS = [140, 150, 220] as const;

/**
 * Базовые нормы: метры при ширине 140 см, размер 48, припуск 1,5 см.
 * minLength — самая длинная деталь: меньше этого взять нельзя даже на широкой ткани.
 */
const BASE_NORMS: Record<GarmentType, { meters: number; minLength: number }> = {
  dress: { meters: 3.2, minLength: 1.4 },
  skirt: { meters: 1.6, minLength: 0.8 },
  pants: { meters: 2.3, minLength: 1.1 },
  shirt: { meters: 2.4, minLength: 0.8 },
  jacket: { meters: 2.8, minLength: 0.9 },
  coat: { meters: 3.6, minLength: 1.2 },
};

export interface WidthOption {
  widthCm: number;
  pricePerMeter?: number;
}

export interface CuttingInput {
  garment: GarmentType;
  /** Размер: обычно 44–56, можно ввести свой. */
  size: number;
  widths: WidthOption[];
  direction: CutDirection;
  pattern: PatternType;
  /** Припуск на швы в сантиметрах, стандарт 1,5 см. */
  seamAllowanceCm: number;
  /** Усадка ткани в процентах, 0–10. */
  shrinkagePercent: number;
}

export interface WidthResult {
  widthCm: number;
  meters: number;
  wastePercent: number;
  pricePerMeter?: number;
  total?: number;
}

export interface CuttingResult {
  results: WidthResult[];
  bestByMeters: WidthResult;
  bestByCost?: WidthResult;
  savings?: { rub: number; versusWidthCm: number };
  notes: string[];
}

/** Округление вверх до 10 см — в магазине так режут рулон. */
const ceil1 = (n: number) => Math.ceil(n * 10 - 1e-9) / 10;

/** Доля полезной площади: на широкой ткани детали раскладываются плотнее. */
function layoutEfficiency(widthCm: number): number {
  const e = 0.84 + (widthCm - 140) * 0.0006;
  return Math.min(0.9, Math.max(0.78, e));
}

/**
 * Считает расход ткани для каждой выбранной ширины рулона.
 *
 * Бросает ошибку, если не выбрана ни одна ширина: считать нечего.
 */
export function calculateCutting(input: CuttingInput): CuttingResult {
  if (input.widths.length === 0) {
    throw new Error("Выберите хотя бы одну ширину рулона");
  }

  const norm = BASE_NORMS[input.garment];

  // каждые 2 размера ≈ +4% ткани; каждый лишний см припуска ≈ +4%
  const sizeFactor = 1 + ((input.size - 48) / 2) * 0.04;
  const seamFactor = 1 + (input.seamAllowanceCm - 1.5) * 0.04;
  const patternFactor = input.pattern === "check" ? 1.15 : input.pattern === "nap" ? 1.1 : 1;
  const directionFactor = input.direction === "crosswise" ? 1.1 : 1;
  const shrinkFactor = 1 + input.shrinkagePercent / 100;

  // площадь самих деталей (м²) — не зависит от ширины рулона
  const netArea = norm.meters * 1.4 * layoutEfficiency(140) * sizeFactor * seamFactor;

  const results: WidthResult[] = input.widths.map(({ widthCm, pricePerMeter }) => {
    const widthM = widthCm / 100;
    const raw = netArea / widthM / layoutEfficiency(widthCm);
    const base = Math.max(raw, norm.minLength * sizeFactor);
    const meters = ceil1(base * patternFactor * directionFactor * shrinkFactor);

    const usedArea = meters * widthM;
    const wastePercent = Math.max(0, Math.round((1 - (netArea * shrinkFactor) / usedArea) * 100));
    const total =
      pricePerMeter && pricePerMeter > 0 ? Math.round(meters * pricePerMeter) : undefined;

    return { widthCm, meters, wastePercent, pricePerMeter, total };
  });

  const bestByMeters = [...results].sort((a, b) => a.meters - b.meters)[0];

  const priced = results.filter((r) => r.total !== undefined);
  let bestByCost: WidthResult | undefined;
  let savings: CuttingResult["savings"];
  if (priced.length >= 1) {
    const sorted = [...priced].sort((a, b) => a.total! - b.total!);
    bestByCost = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (sorted.length >= 2 && worst.total! > bestByCost.total!) {
      savings = {
        rub: worst.total! - bestByCost.total!,
        versusWidthCm: worst.widthCm,
      };
    }
  }

  const notes: string[] = [];
  if (input.pattern === "check") notes.push("Клетка/полоска: +15% на совмещение рисунка.");
  if (input.pattern === "nap") notes.push("Ворс: все детали кроются в одну сторону, +10%.");
  if (input.direction === "crosswise") notes.push("Раскрой по поперечной нити: +10% к расходу.");
  if (input.shrinkagePercent > 0)
    notes.push(`Усадка ${input.shrinkagePercent}% уже добавлена к метражу.`);
  if (input.seamAllowanceCm !== 1.5)
    notes.push(`Припуск на швы ${input.seamAllowanceCm} см (стандарт 1,5 см).`);
  notes.push("Метраж округлён вверх до 10 см — так режут в магазине.");

  return { results, bestByMeters, bestByCost, savings, notes };
}

/** Готовый текст для показа в магазине или сохранения. */
export function describeResult(r: CuttingResult): string[] {
  const lines = r.results.map((x) => {
    let s = `При ширине ${x.widthCm} см нужно ${x.meters.toFixed(1)} м (отходы ${x.wastePercent}%)`;
    if (x.total !== undefined) {
      s += `: ${x.widthCm} см × ${x.meters.toFixed(1)} м × ${x.pricePerMeter} ₽/м = ${x.total} ₽`;
    }
    return s;
  });
  if (r.bestByCost && r.savings) {
    lines.push(
      `Выгоднее ширина ${r.bestByCost.widthCm} см — экономия ${r.savings.rub} ₽ по сравнению с ${r.savings.versusWidthCm} см`
    );
  }
  return lines;
}
