/**
 * Настройки машины → связная русская фраза.
 *
 * Фраза кладётся в контекст рядом с сырым JSON: JSON остаётся источником
 * истины, а фраза объясняет его человеческим языком — так модель реже путает
 * «игла 80/12» с двумя разными размерами.
 */
const NEEDLE = /^(\d{2,3})\/(\d{1,2})$/;

const STITCH: Record<string, string> = {
  straight: "прямой стежок",
  zigzag: "зигзаг",
  narrow_zigzag: "узкий зигзаг",
  overlock: "оверлочный стежок",
  blind_hem: "потайной стежок",
  stretch: "стрейч-стежок",
  triple_straight: "тройной прямой стежок",
};

const FOOT: Record<string, string> = {
  standard: "стандартная",
  teflon: "тефлоновая",
  zipper: "для молнии",
  invisible_zipper: "для потайной молнии",
};

/** Названия стежков словами — для карточки настроек. */
export const STITCH_LABELS = STITCH;

/** Названия лапок словами — для карточки настроек. */
export const FOOT_LABELS = FOOT;

/** Типы игл словами: разные иглы нужны для разных тканей. */
const NEEDLE_TYPE: Record<string, string> = {
  universal: "универсальная",
  ballpoint: "с закруглённым носиком",
  jeans: "джинсовая",
  stretch: "для стрейча",
  microtex: "для тонких тканей",
  leather: "для кожи",
};

/** Материалы нити словами. */
const THREAD_MATERIAL: Record<string, string> = {
  cotton: "хлопковая",
  polyester: "полиэстер",
  reinforced_polyester: "армированный полиэстер",
  silk: "шёлковая",
};

/** Тип иглы словами. Неизвестное значение остаётся как есть. */
export function typeLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const key = value.trim();
  return NEEDLE_TYPE[key] ?? key.replace(/_/g, " ");
}

/** Материал нити словами. Неизвестное значение остаётся как есть. */
export function threadLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const key = value.trim();
  return THREAD_MATERIAL[key] ?? key.replace(/_/g, " ");
}

/**
 * 3 → «3»; [2, 2.5] → «2–2,5»; [3, 3] → «3».
 *
 * Числа в ответе пишутся по-русски: с десятичной запятой и тире в диапазоне.
 * Формула одна на весь пакет — и для фразы, и для карточки настроек.
 */
export function formatRange(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return formatNumber(v);
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((x) => typeof x === "number" && Number.isFinite(x))
  ) {
    const [a, b] = v as [number, number];
    return a === b ? formatNumber(a) : `${formatNumber(a)}–${formatNumber(b)}`;
  }
  return null;
}

/** Десятичная запятая вместо точки: так числа записываются в русском тексте. */
export function formatNumber(n: number): string {
  return String(n).replace(".", ",");
}

/** Первое непустое из списка полей — в сидах названия могут различаться. */
export function pickField(s: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) {
    if (s[k] !== undefined && s[k] !== null) return s[k];
  }
  return undefined;
}

export function humanizeMachineSettings(s: Readonly<Record<string, unknown>>): string {
  const parts: string[] = [];

  const needle = pickField(s, ["needle_size"]);
  if (typeof needle === "string") {
    const m = NEEDLE.exec(needle);
    parts.push(
      m ? `игла ${needle} (метрический №${m[1]}, американский №${m[2]})` : `игла ${needle}`
    );
  }

  const stitch = pickField(s, ["stitch_type"]);
  if (typeof stitch === "string") {
    parts.push(STITCH[stitch] ?? stitch.replace(/_/g, " "));
  }

  const length = formatRange(pickField(s, ["stitch_length_mm", "stitch_length"]));
  if (length) parts.push(`длина стежка ${length} мм`);

  const width = formatRange(pickField(s, ["stitch_width_mm", "stitch_width"]));
  if (width) parts.push(`ширина стежка ${width} мм`);

  const tension = formatRange(pickField(s, ["top_tension"]));
  if (tension) parts.push(`натяжение верхней нити ${tension}`);

  const foot = pickField(s, ["presser_foot", "foot"]);
  if (typeof foot === "string") {
    parts.push(`лапка: ${FOOT[foot] ?? foot.replace(/_/g, " ")}`);
  }

  if (parts.length === 0) return "";
  const text = parts.join(", ");
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}
