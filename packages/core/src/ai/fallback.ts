import type { PageKind } from "./pageContext";

/** Запись каталога в плоском виде — для подсказок при мягком отказе. */
export interface PoolEntry {
  kind: PageKind;
  slug: string;
  name: string;
  aliases?: readonly string[];
}

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

/** Грубая основа: первые 5 букв ловят «джинса / джинсовая / джинсы». */
const stems = (s: string): Set<string> => new Set(words(s).map((w) => w.slice(0, 5)));

/** Ближайшие записи каталога к вопросу: пересечение основ слов, лучшие — первыми. */
export function suggestNearest(query: string, pool: readonly PoolEntry[], limit = 3): PoolEntry[] {
  const q = stems(query);
  if (q.size === 0) return [];

  return pool
    .map((e) => {
      const own = stems([e.name, ...(e.aliases ?? [])].join(" "));
      let hit = 0;
      for (const s of q) if (own.has(s)) hit++;
      return { e, hit };
    })
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit || a.e.name.localeCompare(b.e.name, "ru"))
    .slice(0, limit)
    .map((x) => x.e);
}

/**
 * Правило мягкого отказа.
 *
 * Заменяет прежнее «В каталоге Швейки этого нет»: вместо отказа модель
 * называет, чего именно не хватает, и предлагает ближайшее из переданных
 * данных либо задаёт один уточняющий вопрос.
 */
export const SOFT_REFUSAL_RULE =
  "Если точного ответа в данных нет: не пиши просто «этого нет». Скажи, чего именно нет, " +
  "и предложи ближайшее из переданных данных ИЛИ задай один уточняющий вопрос. " +
  "Не выдумывай записи, которых нет в переданных данных.";

/** Блок с ближайшими записями — подсказка модели, на что переключиться. */
export function buildFallbackBlock(suggestions: readonly PoolEntry[]): string {
  if (suggestions.length === 0) return "";
  const list = suggestions.map((s) => `- ${s.name} (slug: ${s.slug})`).join("\n");
  return `По вопросу нет точных данных. Ближайшие записи каталога, которые можно предложить:\n${list}`;
}
