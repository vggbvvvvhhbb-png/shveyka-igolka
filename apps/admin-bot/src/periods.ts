/**
 * Периоды отчётов.
 *
 * Отчёт считается по московскому времени: владелец читает его вечером, и
 * «сегодня» должно означать московские сутки, а не системные.
 *
 * Москва живёт по UTC+3 круглый год, поэтому смещение постоянное — без
 * пересчёта по сезонам.
 */

/** Смещение Москвы от UTC в миллисекундах. */
export const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Период, за который можно попросить отчёт. */
export type Period = "day" | "week" | "month";

/** Границы периода и его название для человека. */
export interface PeriodRange {
  /** Начало периода включительно. */
  from: Date;
  /** Конец периода не включается. */
  to: Date;
  /** Название периода по-русски. */
  title: string;
}

/** Названия периодов для команд. */
export const PERIOD_LABELS: Record<Period, string> = {
  day: "сегодня",
  week: "7 дней",
  month: "30 дней",
};

/** Число дней в периоде. */
const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/** Разбирает период из команды: `день`, `неделя`, `месяц` или английские слова. */
export function parsePeriod(value: string | undefined): Period {
  const text = (value ?? "").trim().toLowerCase();
  if (text.startsWith("недел") || text.startsWith("week") || text === "7") return "week";
  if (text.startsWith("месяц") || text.startsWith("month") || text === "30") return "month";
  return "day";
}

/** Начало московских суток, в которых находится момент времени. */
function startOfMskDay(now: Date): Date {
  const shifted = new Date(now.getTime() + MSK_OFFSET_MS);
  const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(start - MSK_OFFSET_MS);
}

/**
 * Границы периода.
 *
 * «День» — московские сутки от полуночи до следующей полуночи. «Неделя» и
 * «месяц» — последние семь и тридцать дней: так сравнение с прошлым
 * отчётом честнее, чем календарные недели, которые «прыгают».
 */
export function periodRange(period: Period, now: Date = new Date()): PeriodRange {
  const days = PERIOD_DAYS[period];
  const dayStart = startOfMskDay(now);
  const from = new Date(dayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const to = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { from, to, title: PERIOD_LABELS[period] };
}

/**
 * Момент ближайшей отправки ежедневного отчёта.
 *
 * Отчёт приходит в заданный час по московскому времени. Если этот час уже
 * прошёл сегодня, ждём следующего дня.
 */
export function nextReportTime(hour: number, now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + MSK_OFFSET_MS);
  const today = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  let target = today + hour * 60 * 60 * 1000;
  if (target <= shifted.getTime()) target += 24 * 60 * 60 * 1000;
  return new Date(target - MSK_OFFSET_MS);
}
