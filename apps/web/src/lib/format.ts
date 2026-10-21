import { countPhrase } from "@shveyka/core";

/**
 * Форматирование чисел и денег для интерфейса.
 *
 * Формы числительных («1 вещь», «2 вещи», «5 вещей») берём из core —
 * правило склонения живёт там одно.
 */

/** Рубли: «1 234 ₽». */
export const rub = (n: number): string => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** Метры с запятой: «2,5 м». */
export const meters = (n: number): string =>
  `${String(Math.round(n * 100) / 100).replace(".", ",")} м`;

export { countPhrase };
