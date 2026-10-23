import type { SewnItem } from "./stats";

/**
 * Приводит вещь журнала из JSON к виду, в котором её считает статистика.
 *
 * По сети дата приходит строкой ISO, а в журнале она должна быть датой.
 * Некорректную запись пропускаем: битая строка не должна ломать весь список.
 */
export function parseSewnItem(raw: unknown): SewnItem | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" ? value.name : "";
  if (!id || !name) return null;

  const cost = typeof value.cost === "number" ? value.cost : null;
  if (cost === null || !Number.isFinite(cost)) return null;

  const marketPrice =
    typeof value.marketPrice === "number" && Number.isFinite(value.marketPrice)
      ? value.marketPrice
      : null;

  const fabricSlug =
    typeof value.fabricSlug === "string" && value.fabricSlug ? value.fabricSlug : null;

  const sewnAt = new Date(typeof value.sewnAt === "string" ? value.sewnAt : "");
  if (Number.isNaN(sewnAt.getTime())) return null;

  return {
    id,
    name,
    fabricSlug,
    cost,
    marketPrice,
    gift: value.gift === true,
    sewnAt,
  };
}

/** Разбирает список вещей журнала: битые записи пропускаются. */
export function parseSewnItems(raw: unknown): SewnItem[] {
  if (!Array.isArray(raw)) return [];
  const items: SewnItem[] = [];
  for (const entry of raw) {
    const item = parseSewnItem(entry);
    if (item) items.push(item);
  }
  return items;
}
