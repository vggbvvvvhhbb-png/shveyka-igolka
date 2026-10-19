import { matchesSearchTerm, matchesWordTerm } from "./searchNormalize";

/**
 * Запись каталога в том виде, в котором её сопоставляет поиск.
 */
export type SearchableItem = {
  name: string;
  aliases?: string[];
  composition?: string;
  care?: string;
  issues?: string[];
};

/**
 * Уровень совпадения записи с запросом:
 * 1 — название или алиас, 2 — состав, 3 — свободный текст (уход, проблемы).
 */
export type MatchTier = 1 | 2 | 3;

/**
 * Определяет, насколько прямо запись каталога отвечает на запрос.
 *
 * Уровни нужны, чтобы в контекст ассистента попадали сначала записи, которые
 * названы прямо: иначе слоты занимают ткани, случайно упомянутые в текстах
 * ухода. Возвращает null, если запись не подходит ни по одному слову запроса.
 */
export function matchTier(item: SearchableItem, keywords: string[]): MatchTier | null {
  const terms = keywords.filter((keyword) => keyword.trim().length > 0);
  if (terms.length === 0) return null;

  const { name, aliases, composition, care, issues } = item;

  if (name && terms.some((term) => matchesSearchTerm(name, term))) return 1;
  if (aliases?.some((alias) => terms.some((term) => matchesSearchTerm(alias, term)))) {
    return 1;
  }
  if (composition && terms.some((term) => matchesSearchTerm(composition, term))) {
    return 2;
  }
  if (care && terms.some((term) => matchesWordTerm(care, term))) return 3;
  if (issues?.some((issue) => terms.some((term) => matchesWordTerm(issue, term)))) {
    return 3;
  }

  return null;
}

/**
 * Сортирует записи по уровню совпадения: сначала те, что названы прямо.
 *
 * Порядок внутри одного уровня сохраняется — записи уже отсортированы
 * запросом к базе, и переставлять их незачем.
 */
export function rankByTier<T extends SearchableItem>(items: T[], keywords: string[]): T[] {
  return items
    .map((item, index) => ({ item, index, tier: matchTier(item, keywords) }))
    .filter((entry) => entry.tier !== null)
    .sort((a, b) => (a.tier ?? 9) - (b.tier ?? 9) || a.index - b.index)
    .map((entry) => entry.item);
}
