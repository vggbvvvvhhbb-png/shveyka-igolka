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
 * Минимальная длина «скелета» запроса, с которой допускается совпадение,
 * когда слово каталога длиннее запроса.
 *
 * «шить» и «шторы» отличаются одной буквой, но скелеты у них разные:
 * «шт» и «штры». Короткий скелет вроде «шт» совпал бы с любой половиной
 * слов на «шт», поэтому в эту сторону сравниваем только от трёх согласных.
 */
const MIN_PREFIX_QUERY_LENGTH = 3;

/** Разделители слов: всё, что не буква и не цифра. */
const WORD_SEPARATORS = /[^\p{L}\p{N}]+/u;

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
 * Разбивает текст на слова: буквы и цифры вместе, всё остальное — разделители.
 *
 * Сравнение по словам, а не по всей строке: иначе скелет фразы начинается
 * с первого слова и слова на «шт» начинают совпадать с любым текстом.
 */
export function splitWords(value: string): string[] {
  return normalizeSearchText(value)
    .split(WORD_SEPARATORS)
    .filter((word) => word.length > 0);
}

/**
 * Проверяет, совпадает ли запрос с текстом каталога.
 *
 * Сравнение идёт в два приёма, от точного к приближённому:
 * 1. нормализованный текст содержит нормализованный запрос;
 * 2. совпадают скелеты слов — так находятся падежные формы.
 *
 * Обратного сравнения («запрос содержит текст») здесь нет: короткое название
 * вроде «Лён» нашлось бы внутри любого слова, где есть «лен», — например
 * в «расправленном».
 *
 * Приближённое сравнение включается только для слов от трёх букв и только
 * если «скелет» не короче двух букв: у коротких слов он совпал бы с кем угодно.
 * Если слово каталога длиннее запроса, скелет запроса должен быть не короче
 * трёх согласных — иначе «шить» находит «шторы».
 */
export function matchesSearchTerm(haystack: string, needle: string): boolean {
  const text = normalizeSearchText(haystack);
  const query = normalizeSearchText(needle);
  if (text.length === 0 || query.length === 0) return false;

  if (text.includes(query)) return true;

  const queryWords = splitWords(query).filter((word) => word.length >= MIN_APPROXIMATE_LENGTH);
  if (queryWords.length === 0) return false;

  const textWords = splitWords(text);
  for (const queryWord of queryWords) {
    const querySkeleton = searchSkeleton(queryWord);
    if (querySkeleton.length < MIN_SKELETON_LENGTH) continue;

    for (const textWord of textWords) {
      const textSkeleton = searchSkeleton(textWord);
      if (textSkeleton.length < MIN_SKELETON_LENGTH) continue;

      // Запрос длиннее слова: «льняной» → «лён».
      if (querySkeleton.startsWith(textSkeleton)) return true;

      // Слово длиннее запроса: «шторы» → «шить». Короткий скелет запроса
      // отсекаем: «шт» совпал бы с любой половиной слов на «шт».
      if (
        querySkeleton.length >= MIN_PREFIX_QUERY_LENGTH &&
        textSkeleton.startsWith(querySkeleton)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Проверяет, встречается ли запрос в тексте как целое слово.
 *
 * Нужен для свободных текстов — ухода и типичных проблем. Совпадение
 * подстроки там даёт мусор: запрос «лен» попадал в «расправленном»,
 * «медленно» и «усиленных». Здесь слово должно совпасть целиком.
 *
 * Граница слова — любая буква. Цифра и знак препинания границей считаются,
 * поэтому «лен» найдётся в «100% лен».
 */
export function matchesWordTerm(haystack: string, needle: string): boolean {
  const text = normalizeSearchText(haystack);
  const query = normalizeSearchText(needle);
  if (text.length === 0 || query.length === 0) return false;

  const pattern = new RegExp(`(^|[^\\p{L}])${escapeRegExp(query)}([^\\p{L}]|$)`, "u");
  return pattern.test(text);
}

/**
 * Экранирует спецсимволы регулярного выражения, чтобы запрос искался
 * буквально, а не как шаблон.
 *
 * Функция нужна и в SQL: запрос попадает в условие поиска как параметр, а
 * экранированный вид используется в регулярном выражении.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
