import type { ProjectEntry } from "../calculator/profit";
import type { SewnInput } from "./validate";

/** Ключ, под которым калькулятор хранил историю проектов в браузере. */
export const LEGACY_PROJECTS_KEY = "sewing:projects";

/** Запись в журнале, с которой сравнивается импортируемая вещь. */
export interface StoredSewnItem {
  name: string;
  cost: number;
  marketPrice: number | null;
  /** Дата в формате ГГГГ-ММ-ДД. */
  date: string;
  gift: boolean;
}

/**
 * Разбирает сохранённую в браузере историю проектов.
 *
 * Возвращает пустой массив, если данных нет или они испорчены: потерять
 * запись из-за чужой ошибки хуже, чем не найти её.
 */
export function parseStoredProjects(raw: string | null | undefined): ProjectEntry[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const entries: ProjectEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const raw_ = item as Record<string, unknown>;
    const title = typeof raw_.title === "string" ? raw_.title.trim() : "";
    const cost = typeof raw_.cost === "number" && Number.isFinite(raw_.cost) ? raw_.cost : null;
    const shopPrice =
      typeof raw_.shopPrice === "number" && Number.isFinite(raw_.shopPrice) ? raw_.shopPrice : 0;
    if (!title || cost === null || cost < 0) continue;
    entries.push({
      id: typeof raw_.id === "number" ? raw_.id : entries.length,
      title,
      date: typeof raw_.date === "string" ? raw_.date : "",
      gift: raw_.gift === true,
      cost: Math.round(cost),
      shopPrice: Math.round(shopPrice),
    });
  }
  return entries;
}

/**
 * Превращает запись старой истории в вещь журнала.
 * Дата из записи может быть пустой — тогда вещь получит сегодняшний день.
 */
export function storedProjectToSewnInput(entry: ProjectEntry): SewnInput {
  const sewnAt = entry.date ? new Date(`${entry.date}T12:00:00Z`) : undefined;
  const validDate = sewnAt && !Number.isNaN(sewnAt.getTime()) ? sewnAt : undefined;
  return {
    name: entry.title,
    cost: Math.round(entry.cost),
    marketPrice: entry.shopPrice > 0 ? Math.round(entry.shopPrice) : null,
    fabricSlug: null,
    gift: entry.gift,
    ...(validDate ? { sewnAt: validDate } : {}),
  };
}

/**
 * Проверяет, нет ли такой вещи в журнале: то же название, те же затраты и
 * та же дата. По этой проверке повторный импорт не создаёт дублей.
 */
export function isAlreadyStored(entry: ProjectEntry, items: StoredSewnItem[]): boolean {
  return items.some(
    (item) =>
      item.name === entry.title &&
      item.cost === Math.round(entry.cost) &&
      item.date === entry.date &&
      item.gift === entry.gift
  );
}
