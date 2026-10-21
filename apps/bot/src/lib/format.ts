import { countPhrase } from "@shveyka/core";

export { countPhrase };

/** Рубли: «1 234 ₽». */
export const rub = (n: number): string => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** Диапазон цен: «80–250 ₽», а если границы совпали — просто «60 ₽». */
export const rubRange = ([a, b]: [number, number]): string =>
  a === b ? rub(a) : `${Math.round(a).toLocaleString("ru-RU")}–${rub(b)}`;

/** Метры: «2,5 м». */
export const meters = (n: number): string =>
  `${String(Math.round(n * 100) / 100).replace(".", ",")} м`;

/** «1 500», «1500₽», «2,5» → число. Не число — null. */
export function parseNum(input: string): number | null {
  const t = input
    .replace(/(₽|руб\.?|р\.|см|%)/gi, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}
