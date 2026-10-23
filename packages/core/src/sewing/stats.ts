/** Сшитая вещь, как её хранит база. */
export interface SewnItem {
  id: string;
  name: string;
  fabricSlug: string | null;
  cost: number;
  marketPrice: number | null;
  /** Подарок: его себестоимость не считается экономией. */
  gift: boolean;
  sewnAt: Date;
}

export interface YearStats {
  year: number;
  count: number;
  totalCost: number;
  /** Сумма (цена в магазине − затраты) по вещам, у которых цена в магазине указана. */
  totalSaved: number;
  /** Вещей с указанной ценой в магазине — по ним посчитана экономия. */
  pricedCount: number;
  /** Подарков за год. */
  giftCount: number;
  /** Потрачено на подарки. */
  giftSpent: number;
  topFabrics: { slug: string; count: number }[];
  /** Сколько вещей сшито в каждом месяце: индекс 0 — январь. */
  perMonth: number[];
}

const TOP_FABRICS = 3;

/**
 * Итоги года по сшитым вещам. Год и месяц считаются по UTC.
 *
 * В затраты входят все вещи, включая подарки, а экономия считается только по
 * вещам для себя: подарок — это траты, а не выгода.
 */
export function buildYearStats(items: SewnItem[], year: number): YearStats {
  const inYear = items.filter((item) => item.sewnAt.getUTCFullYear() === year);
  const perMonth = Array.from({ length: 12 }, () => 0);
  const fabricCounts = new Map<string, number>();
  let totalCost = 0;
  let totalSaved = 0;
  let pricedCount = 0;
  let giftCount = 0;
  let giftSpent = 0;

  for (const item of inYear) {
    perMonth[item.sewnAt.getUTCMonth()] += 1;
    totalCost += item.cost;
    if (item.gift) {
      giftCount += 1;
      giftSpent += item.cost;
    } else if (item.marketPrice !== null) {
      totalSaved += item.marketPrice - item.cost;
      pricedCount += 1;
    }
    if (item.fabricSlug) {
      fabricCounts.set(item.fabricSlug, (fabricCounts.get(item.fabricSlug) ?? 0) + 1);
    }
  }

  const topFabrics = [...fabricCounts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, TOP_FABRICS);

  return {
    year,
    count: inYear.length,
    totalCost,
    totalSaved,
    pricedCount,
    giftCount,
    giftSpent,
    topFabrics,
    perMonth,
  };
}

/** Сводка за месяц: месяц задаётся числом, 0 — январь. */
export interface SewnMonthStats {
  /** Все вещи за месяц. */
  count: number;
  giftCount: number;
  giftSpent: number;
  /** Экономия по вещам для себя. */
  savedTotal: number;
}

/**
 * Сводка по месяцу по вещам журнала. Месяц и год считаются по UTC —
 * так же, как в итогах года.
 */
export function buildMonthStats(items: SewnItem[], year: number, month: number): SewnMonthStats {
  const list = items.filter(
    (item) => item.sewnAt.getUTCFullYear() === year && item.sewnAt.getUTCMonth() === month
  );
  const own = list.filter((item) => !item.gift);
  const gifts = list.filter((item) => item.gift);
  return {
    count: list.length,
    giftCount: gifts.length,
    giftSpent: gifts.reduce((sum, item) => sum + item.cost, 0),
    savedTotal: own.reduce(
      (sum, item) =>
        sum + (item.marketPrice === null ? 0 : Math.max(0, item.marketPrice - item.cost)),
      0
    ),
  };
}
