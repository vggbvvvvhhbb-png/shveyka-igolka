import { desc, eq } from "drizzle-orm";
import type { SewnInput, SewnItem } from "@shveyka/core";
import type { DatabaseClient } from "../client";
import { sewnItems } from "../schema";
import { withRetry } from "../utils/withRetry";

type SewnRow = typeof sewnItems.$inferSelect;

function toSewnItem(row: SewnRow): SewnItem {
  return {
    id: row.id,
    name: row.name,
    fabricSlug: row.fabric_slug,
    cost: row.cost,
    marketPrice: row.market_price,
    gift: row.gift,
    sewnAt: row.sewn_at,
  };
}

/** Записывает сшитую вещь. Без даты вещь получает текущий момент. */
export async function addSewnItem(db: DatabaseClient, input: SewnInput): Promise<SewnItem> {
  const rows = await withRetry(() =>
    db
      .insert(sewnItems)
      .values({
        id: crypto.randomUUID(),
        name: input.name,
        fabric_slug: input.fabricSlug,
        cost: input.cost,
        market_price: input.marketPrice,
        gift: input.gift,
        ...(input.sewnAt ? { sewn_at: input.sewnAt } : {}),
      })
      .returning()
  );
  return toSewnItem(rows[0]);
}

/** Все сшитые вещи, свежие сверху. */
export async function listSewnItems(db: DatabaseClient): Promise<SewnItem[]> {
  const rows = await withRetry(() => db.select().from(sewnItems).orderBy(desc(sewnItems.sewn_at)));
  return rows.map(toSewnItem);
}

/** Удаляет вещь из журнала. Возвращает false, если такой записи не было. */
export async function deleteSewnItem(db: DatabaseClient, id: string): Promise<boolean> {
  const rows = await withRetry(() =>
    db.delete(sewnItems).where(eq(sewnItems.id, id)).returning({ id: sewnItems.id })
  );
  return rows.length > 0;
}
