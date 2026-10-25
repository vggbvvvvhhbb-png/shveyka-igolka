export type JsonLd = Record<string, unknown>;

export interface StepInput {
  title: string;
  description: string;
  order: number;
  minutes: number;
}

/** Первая непустая строка из перечисленных полей. */
function pickString(o: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const v = o[key];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

/**
 * Достаёт шаги из сырого jsonb.
 *
 * Форма шагов разная: у проекта это `title` + `description`, у шва —
 * `instruction`. Терпимо к обеим формам, но только к реальным строкам.
 */
export function readSteps(raw: unknown): StepInput[] {
  if (!Array.isArray(raw)) return [];

  const steps: StepInput[] = [];

  raw.forEach((item, i) => {
    if (typeof item !== "object" || item === null) return;

    const o = item as Record<string, unknown>;
    const title = pickString(o, ["title", "name"]);
    const description = pickString(o, ["description", "text", "instruction"]);

    if (!title && !description) return;

    steps.push({
      title: title || description,
      description: description || title,
      order: typeof o.order === "number" ? o.order : i + 1,
      minutes: typeof o.estimated_minutes === "number" ? o.estimated_minutes : 0,
    });
  });

  return steps.sort((a, b) => a.order - b.order);
}

/**
 * Разметка HowTo для шва и проекта.
 *
 * Без шагов разметка не нужна — возвращаем null: пустой HowTo в разметке
 * хуже, чем его отсутствие.
 */
export function howToJsonLd(o: {
  name: string;
  description: string;
  url: string;
  steps: readonly StepInput[];
  supplies?: readonly string[];
}): JsonLd | null {
  if (o.steps.length === 0) return null;

  const total = o.steps.reduce((s, x) => s + x.minutes, 0);

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: o.name,
    description: o.description,
    inLanguage: "ru",
    url: o.url,
    ...(total > 0 ? { totalTime: `PT${total}M` } : {}),
    ...(o.supplies?.length
      ? { supply: o.supplies.map((name) => ({ "@type": "HowToSupply", name })) }
      : {}),
    step: o.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.description,
    })),
  };
}

/**
 * Ткань — справочный термин, а не товар: у нас нет цены и наличия,
 * а Product дал бы ошибки в Search Console.
 */
export function fabricJsonLd(o: {
  name: string;
  description: string;
  url: string;
  aliases: readonly string[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: o.name,
    description: o.description,
    inLanguage: "ru",
    url: o.url,
    ...(o.aliases.length ? { alternateName: [...o.aliases] } : {}),
    inDefinedTermSet: { "@type": "DefinedTermSet", name: "Каталог тканей Швейки" },
  };
}

/** Экранирует `<`, чтобы строка из БД не закрыла тег `<script>`. */
export function serializeJsonLd(d: JsonLd): string {
  return JSON.stringify(d)
    .replace(/</g, "\\u003c")
    .replace(/\u2028|\u2029/g, "");
}
