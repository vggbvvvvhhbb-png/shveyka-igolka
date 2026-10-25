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

/** 3 → «3»; [2, 2.5] → «2–2,5»; [3, 3] → «3». */
function range(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return num(v);
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((x) => typeof x === "number" && Number.isFinite(x))
  ) {
    const [a, b] = v as [number, number];
    return a === b ? num(a) : `${num(a)}–${num(b)}`;
  }
  return null;
}

/** Десятичная запятая вместо точки: так числа записываются в русском тексте. */
function num(n: number): string {
  return String(n).replace(".", ",");
}

/** Первое непустое из списка полей — в сидах названия могут различаться. */
function pick(s: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) {
    if (s[k] !== undefined && s[k] !== null) return s[k];
  }
  return undefined;
}

export function humanizeMachineSettings(s: Readonly<Record<string, unknown>>): string {
  const parts: string[] = [];

  const needle = pick(s, ["needle_size"]);
  if (typeof needle === "string") {
    const m = NEEDLE.exec(needle);
    parts.push(
      m ? `игла ${needle} (метрический №${m[1]}, американский №${m[2]})` : `игла ${needle}`
    );
  }

  const stitch = pick(s, ["stitch_type"]);
  if (typeof stitch === "string") {
    parts.push(STITCH[stitch] ?? stitch.replace(/_/g, " "));
  }

  const length = range(pick(s, ["stitch_length_mm", "stitch_length"]));
  if (length) parts.push(`длина стежка ${length} мм`);

  const width = range(pick(s, ["stitch_width_mm", "stitch_width"]));
  if (width) parts.push(`ширина стежка ${width} мм`);

  const tension = range(pick(s, ["top_tension"]));
  if (tension) parts.push(`натяжение верхней нити ${tension}`);

  const foot = pick(s, ["presser_foot", "foot"]);
  if (typeof foot === "string") {
    parts.push(`лапка: ${FOOT[foot] ?? foot.replace(/_/g, " ")}`);
  }

  if (parts.length === 0) return "";
  const text = parts.join(", ");
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}
