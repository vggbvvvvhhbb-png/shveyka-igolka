/**
 * Русские числительные формы существительных.
 *
 * В интерфейсе нужно писать «Найдено 1 ткань», «Найдено 2 ткани»,
 * «Найдено 5 тканей» — одной строки недостаточно.
 */

/**
 * Три формы слова: одна штука, несколько, много.
 *
 * Пример: ["ткань", "ткани", "тканей"].
 */
export type PluralForms = readonly [one: string, few: string, many: string];

/**
 * Выбирает форму слова по числу.
 *
 * Правило русского языка:
 * - 1, 21, 31, 101… — одна форма;
 * - 2–4, 22–24… — вторая форма;
 * - всё остальное — третья.
 */
export function pluralRu(count: number, forms: PluralForms): string {
  const n = Math.abs(count);
  const lastTwo = n % 100;
  const last = n % 10;

  if (last === 1 && lastTwo !== 11) return forms[0];
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1];
  return forms[2];
}

/**
 * Число вместе со склонённым словом: «1 ткань», «5 тканей».
 */
export function countPhrase(count: number, forms: PluralForms): string {
  return `${count} ${pluralRu(count, forms)}`;
}
