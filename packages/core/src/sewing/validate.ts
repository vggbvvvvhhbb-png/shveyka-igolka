/** Сшитая вещь в том виде, в котором её принимают API сайта и бот. */
export interface SewnInput {
  name: string;
  /** Полная себестоимость, целых рублей. */
  cost: number;
  /** Сколько стоит похожая вещь в магазине, целых рублей. */
  marketPrice: number | null;
  fabricSlug: string | null;
  /** Подарок: его себестоимость не считается экономией. */
  gift: boolean;
  /** Дата готовности; без неё вещь записывается сегодняшним днём. */
  sewnAt?: Date;
}

export type SewnValidation = { ok: true; value: SewnInput } | { ok: false; error: string };

export const SEWN_NAME_MAX = 80;
const MONEY_MAX = 10_000_000;
const SLUG_PATTERN = /^[a-z0-9-]{1,60}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseMoney(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MONEY_MAX) {
    return undefined;
  }
  return value;
}

/** Проверяет тело запроса «добавить сшитую вещь». */
export function validateSewnInput(body: unknown, now: Date = new Date()): SewnValidation {
  if (!body || typeof body !== "object") return { ok: false, error: "Некорректный запрос" };
  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "Укажите название вещи" };
  if (name.length > SEWN_NAME_MAX) {
    return { ok: false, error: `Название не длиннее ${SEWN_NAME_MAX} символов` };
  }

  const cost = parseMoney(raw.cost);
  if (cost === undefined || cost === null) {
    return { ok: false, error: "Затраты — целое число рублей, не меньше нуля" };
  }

  const marketPrice = parseMoney(raw.marketPrice);
  if (marketPrice === undefined) {
    return { ok: false, error: "Цена в магазине — целое число рублей, не меньше нуля" };
  }

  let fabricSlug: string | null = null;
  if (raw.fabricSlug !== null && raw.fabricSlug !== undefined && raw.fabricSlug !== "") {
    if (typeof raw.fabricSlug !== "string" || !SLUG_PATTERN.test(raw.fabricSlug)) {
      return { ok: false, error: "Некорректная ткань" };
    }
    fabricSlug = raw.fabricSlug;
  }

  // Подарок помечается флажком; без него вещь считается «для себя».
  let gift = false;
  if (raw.gift !== null && raw.gift !== undefined) {
    if (typeof raw.gift !== "boolean") return { ok: false, error: "Некорректный признак подарка" };
    gift = raw.gift;
  }

  let sewnAt: Date | undefined;
  if (raw.sewnAt !== undefined && raw.sewnAt !== null && raw.sewnAt !== "") {
    const date = typeof raw.sewnAt === "string" ? new Date(raw.sewnAt) : null;
    if (!date || Number.isNaN(date.getTime()) || date.getTime() > now.getTime() + DAY_MS) {
      return { ok: false, error: "Некорректная дата" };
    }
    sewnAt = date;
  }

  return { ok: true, value: { name, cost, marketPrice, fabricSlug, gift, sewnAt } };
}
