/**
 * Нормализация текста для поиска по каталогу.
 *
 * Каталог и запрос пользователя записывают одно и то же по-разному:
 * «ё» против «е», падежные формы («лён» → «льня», «льна»), мягкий знак то
 * есть, то нет. Без нормализации запрос «из льна» не находит ткань «Лён».
 */

/** Гласные, которые отбрасываются в «скелете» слова. */
const VOWELS = /[аеиоуыэюя]/g;

/** Мягкий знак: в «скелете» слова он не учитывается. */
const SOFT_SIGN = /ь/g;

/** Минимальная длина слова, с которой включается приближённое сравнение. */
const MIN_APPROXIMATE_LENGTH = 3;

/** Минимальная длина «скелета», с которой он вообще что-то значит. */
const MIN_SKELETON_LENGTH = 2;

/**
 * Приводит текст к общему виду: нижний регистр, «ё» → «е», «ъ» → «ь».
 * Пробелы схлопываются — сравнение не должно зависеть от лишних пробелов.
 */
export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/ъ/g, "ь").replace(/\s+/g, " ").trim();
}

/**
 * «Скелет» слова — согласные без мягкого знака.
 *
 * По скелету сопоставляются падежные формы: «лён», «лень», «льня» и «льна»
 * дают один и тот же скелет. Если после отбрасывания гласных ничего не
 * осталось, слово для сравнения не годится.
 */
export function searchSkeleton(value: string): string {
  return normalizeSearchText(value).replace(VOWELS, "").replace(SOFT_SIGN, "");
}

/**
 * Проверяет, совпадает ли запрос с текстом каталога.
 *
 * Сравнение идёт в два приёма, от точного к приближённому:
 * 1. нормализованный текст содержит нормализованный запрос (или наоборот);
 * 2. совпадают начала «скелетов» слов — так находятся падежные формы.
 *
 * Приближённое сравнение включается только для слов от трёх букв и только
 * если «скелет» не короче двух букв: у коротких слов он совпал бы с кем угодно.
 */
export function matchesSearchTerm(haystack: string, needle: string): boolean {
  const text = normalizeSearchText(haystack);
  const query = normalizeSearchText(needle);
  if (text.length === 0 || query.length === 0) return false;

  if (text.includes(query) || query.includes(text)) return true;
  if (query.length < MIN_APPROXIMATE_LENGTH) return false;

  const textSkeleton = searchSkeleton(haystack);
  const querySkeleton = searchSkeleton(needle);
  if (textSkeleton.length < MIN_SKELETON_LENGTH || querySkeleton.length < MIN_SKELETON_LENGTH) {
    return false;
  }

  return textSkeleton.startsWith(querySkeleton) || querySkeleton.startsWith(textSkeleton);
}
