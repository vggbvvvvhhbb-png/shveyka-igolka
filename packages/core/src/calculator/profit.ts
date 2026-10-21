/**
 * Калькулятор «Выгодно ли шить самой?» — полная себестоимость против цены в магазине.
 *
 * Модуль чистый: без React и без БД — его переиспользует и сайт, и бот.
 */

export interface ProfitInput {
  /** Ткань: метраж × цена, ₽. */
  fabric: number;
  lining: number;
  /** Фурнитура: пуговицы, молнии, резинки. */
  hardware: number;
  thread: number;
  /** Дублирин / флизелин. */
  interfacing: number;
  /** Время на пошив, часов. */
  hours: number;
  /** Стоимость своего часа, ₽/час. 0 — своё время не считаем. */
  hourlyRate: number;
  /** Амортизация машинки и оверлока, ₽/час. */
  toolWearPerHour: number;
  /** Электричество, ₽/час. */
  electricityPerHour: number;
  /** Цена похожей вещи в магазине, ₽. */
  shopPrice: number;
}

export interface ProfitResult {
  materials: number;
  labor: number;
  tools: number;
  electricity: number;
  /** Полная себестоимость. */
  cost: number;
  /** Экономия в рублях. Может быть отрицательной. */
  saved: number;
  savedPercent: number;
  /** Себестоимость, если ценить своё время в 100 ₽/час — для мотивации. */
  costWith100PerHour: number;
  /** При какой цене часа шить всё ещё выгодно. */
  breakEvenHourlyRate: number;
  messages: string[];
}

export const DEFAULT_PROFIT_INPUT: ProfitInput = {
  fabric: 0,
  lining: 0,
  hardware: 0,
  thread: 0,
  interfacing: 0,
  hours: 0,
  hourlyRate: 0,
  toolWearPerHour: 0,
  electricityPerHour: 0,
  shopPrice: 0,
};

/** Считает себестоимость и экономию по введённым суммам. */
export function calcProfit(i: ProfitInput): ProfitResult {
  const materials = i.fabric + i.lining + i.hardware + i.thread + i.interfacing;
  const labor = i.hours * i.hourlyRate;
  const tools = i.hours * i.toolWearPerHour;
  const electricity = i.hours * i.electricityPerHour;
  const cost = materials + labor + tools + electricity;

  const saved = i.shopPrice - cost;
  const savedPercent = i.shopPrice > 0 ? Math.round((saved / i.shopPrice) * 100) : 0;

  const costNoTime = materials + tools + electricity;
  const costWith100PerHour = costNoTime + i.hours * 100;
  const breakEvenHourlyRate =
    i.hours > 0 ? Math.max(0, Math.floor((i.shopPrice - costNoTime) / i.hours)) : 0;

  const messages: string[] = [];
  if (i.shopPrice > 0) {
    if (saved > 0) {
      messages.push(
        `Ты экономишь ${Math.round(saved)} ₽ (${savedPercent}%). Плюс вещь сидит точно по твоей фигуре.`
      );
      if (i.hourlyRate === 0 && i.hours > 0 && costWith100PerHour < i.shopPrice) {
        messages.push(
          `Даже если ценить своё время в 100 ₽/час, всё равно выгодно: ${Math.round(costWith100PerHour)} ₽ против ${Math.round(i.shopPrice)} ₽.`
        );
      }
      if (i.hours > 0) {
        messages.push(
          `Шить выгодно, пока час твоего времени стоит не дороже ${breakEvenHourlyRate} ₽.`
        );
      }
    } else {
      messages.push(
        `По деньгам готовая вещь дешевле на ${Math.abs(Math.round(saved))} ₽. Зато в магазине не найти точно такую ткань и фасон.`
      );
    }
  }
  messages.push("Своё изделие обычно служит 3–5 лет, магазинное — 1–2 года (примерно).");
  messages.push("В магазине не найдёшь точно такую ткань и фасон.");

  return {
    materials,
    labor,
    tools,
    electricity,
    cost,
    saved,
    savedPercent,
    costWith100PerHour,
    breakEvenHourlyRate,
    messages,
  };
}

/** Запись в истории проектов. */
export interface ProjectEntry {
  id: number;
  title: string;
  /** Дата в формате ГГГГ-ММ-ДД. */
  date: string;
  /** Подарок — не считается в экономии. */
  gift: boolean;
  cost: number;
  shopPrice: number;
}

export interface MonthStats {
  /** Все сшитые вещи за месяц. */
  count: number;
  giftCount: number;
  giftSpent: number;
  /** Экономия только по вещам для себя. */
  savedTotal: number;
}

/**
 * Сводка по месяцу. ym — строка вида «2026-10».
 */
export function monthStats(entries: ProjectEntry[], ym: string): MonthStats {
  const list = entries.filter((e) => e.date.startsWith(ym));
  const gifts = list.filter((e) => e.gift);
  const own = list.filter((e) => !e.gift);
  return {
    count: list.length,
    giftCount: gifts.length,
    giftSpent: gifts.reduce((s, e) => s + e.cost, 0),
    savedTotal: own.reduce((s, e) => s + Math.max(0, e.shopPrice - e.cost), 0),
  };
}
