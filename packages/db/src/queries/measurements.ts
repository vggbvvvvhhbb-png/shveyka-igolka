import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { measurements } from "../schema";
import { withRetry } from "../utils/withRetry";

export type Measurements = typeof measurements.$inferSelect;

/** Идентификатор единственной записи с мерками. */
export const MEASUREMENTS_ID = "default";

/** Значения мерок, которые можно сохранить. */
export type MeasurementsValues = {
  bust?: number | null;
  waist?: number | null;
  hip?: number | null;
  height?: number | null;
};

/** Мерки пользователя или undefined, если их ещё нет. */
export async function getMeasurements(db: DatabaseClient): Promise<Measurements | undefined> {
  const rows = await withRetry(() =>
    db.select().from(measurements).where(eq(measurements.id, MEASUREMENTS_ID)).limit(1)
  );
  return rows[0];
}

/**
 * Сохраняет мерки: запись создаётся, если её ещё нет, иначе обновляется.
 * Пустое значение (null) означает «мерка не заполнена».
 */
export async function saveMeasurements(
  db: DatabaseClient,
  values: MeasurementsValues
): Promise<Measurements> {
  const normalized: MeasurementsValues = {
    bust: values.bust ?? null,
    waist: values.waist ?? null,
    hip: values.hip ?? null,
    height: values.height ?? null,
  };

  return withRetry(async () => {
    const existing = await db
      .select()
      .from(measurements)
      .where(eq(measurements.id, MEASUREMENTS_ID))
      .limit(1);

    if (existing.length > 0) {
      const rows = await db
        .update(measurements)
        .set({ ...normalized, updated_at: new Date() })
        .where(eq(measurements.id, MEASUREMENTS_ID))
        .returning();
      return rows[0];
    }

    const rows = await db
      .insert(measurements)
      .values({ id: MEASUREMENTS_ID, ...normalized })
      .returning();
    return rows[0];
  });
}
