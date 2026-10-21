/**
 * Подбор аналога ткани: ищем похожую ткань подешевле.
 *
 * База тканей передаётся параметром, поэтому логику можно переиспользовать
 * и с другой базой (например, из БД) — без правок самого расчёта.
 */

import {
  FABRIC_OPTIONS,
  TRAIT_LABELS,
  type Density,
  type FabricOption,
  type FiberGroup,
  type Purpose,
  type Season,
  type Trait,
} from "./fabrics";

export interface AnalogQuery {
  /** Название исходной ткани, если оно известно. */
  name?: string;
  fiber?: FiberGroup;
  density?: Density;
  purpose?: Purpose;
  season?: Season;
  /** Текущая цена исходной ткани за метр, ₽. */
  pricePerMeter?: number;
  widthCm?: number;
  /** Обязательные свойства — аналог должен иметь все перечисленные. */
  traits?: Trait[];
  /** Показывать только ткани дешевле исходной. */
  onlyCheaper?: boolean;
}

export interface AnalogItem {
  fabric: FabricOption;
  /** На сколько рублей за метр дешевле исходной ткани. */
  savingsPerMeter: number;
  savingsPercent: number;
  /** Ткань из той же группы волокон, что и исходная. */
  sameFiber: boolean;
  /** Чем аналог отличается от исходной ткани. */
  differences: string[];
}

export interface AnalogResult {
  /** Исходная ткань, если её нашли в базе. */
  original?: FabricOption;
  warnings: string[];
  analogs: AnalogItem[];
}

const DENSITY_RANK: Record<Density, number> = { light: 0, medium: 1, heavy: 2 };

/** Приводит строку к сравнимому виду: нижний регистр и «е» вместо «ё». */
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Ищет ткань в базе по названию или синониму. */
export function findFabricByName(
  name: string,
  catalog: FabricOption[] = FABRIC_OPTIONS
): FabricOption | undefined {
  const n = norm(name);
  if (n.length < 2) return undefined;
  return catalog.find(
    (f) => norm(f.name).includes(n) || f.aliases.some((a) => norm(a) === n || n.includes(norm(a)))
  );
}

/**
 * Предупреждения о неудачном сочетании: тонкая ткань на зиму и т.п.
 */
export function seasonWarnings(purpose?: Purpose, season?: Season, density?: Density): string[] {
  const w: string[] = [];
  if (purpose === "coat" && density === "light")
    w.push("Для пальто тонкий материал не подойдёт — смотри шерсть или драп.");
  if (season === "winter" && density === "light")
    w.push("Для зимы тонкая ткань слишком холодная — нужна плотная или с подкладкой.");
  if (season === "summer" && density === "heavy") w.push("Плотная ткань летом будет жаркой.");
  return w;
}

/** Различия аналога и исходной ткани: что лучше, что хуже. */
function differences(orig: FabricOption | undefined, a: FabricOption): string[] {
  const out: string[] = [];
  if (!orig) return out;
  for (const t of orig.traits)
    if (!a.traits.includes(t)) out.push(`Хуже: ${TRAIT_LABELS[t].toLowerCase()}`);
  for (const t of a.traits)
    if (!orig.traits.includes(t)) out.push(`Лучше: ${TRAIT_LABELS[t].toLowerCase()}`);
  if (a.fiber !== orig.fiber) out.push(`Состав другой: ${a.composition}`);
  return out;
}

/**
 * Подбирает аналоги по запросу.
 *
 * Если исходная ткань найдена в базе, её свойства подставляются в запрос,
 * поэтому достаточно указать только название.
 */
export function findAnalogs(
  q: AnalogQuery,
  catalog: FabricOption[] = FABRIC_OPTIONS
): AnalogResult {
  const original = q.name ? findFabricByName(q.name, catalog) : undefined;

  const purpose = q.purpose ?? original?.purposes[0];
  const season = q.season ?? original?.seasons[0];
  const density = q.density ?? original?.density;
  const price = q.pricePerMeter ?? original?.price ?? 0;

  const warnings = seasonWarnings(purpose, season, density);

  const analogs = catalog
    .filter((f) => f.id !== original?.id)
    .filter((f) => !purpose || f.purposes.includes(purpose))
    .filter((f) => !season || f.seasons.includes(season))
    .filter((f) => !density || Math.abs(DENSITY_RANK[f.density] - DENSITY_RANK[density]) <= 1)
    .filter((f) => !q.fiber || f.fiber === q.fiber)
    .filter((f) => (q.traits ?? []).every((t) => f.traits.includes(t)))
    .filter((f) => !(q.onlyCheaper && price > 0) || f.price < price)
    .sort((a, b) => a.price - b.price)
    .map<AnalogItem>((f) => ({
      fabric: f,
      savingsPerMeter: price > 0 ? price - f.price : 0,
      savingsPercent: price > 0 ? Math.round(((price - f.price) / price) * 100) : 0,
      sameFiber: original ? f.fiber === original.fiber : f.fiber === q.fiber,
      differences: differences(original, f),
    }));

  return { original, warnings, analogs };
}
