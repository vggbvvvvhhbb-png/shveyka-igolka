import { eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { seams, fabrics } from "../schema";
import type { SeamType } from "@shveyka/core";

export type Seam = typeof seams.$inferSelect;

/**
 * Get a single seam by its slug id.
 */
export async function getSeamById(db: DatabaseClient, id: string): Promise<Seam | undefined> {
  const rows = await db.select().from(seams).where(eq(seams.id, id)).limit(1);
  return rows[0];
}

/**
 * List seams filtered by type.
 */
export async function listSeamsByType(db: DatabaseClient, type: SeamType): Promise<Seam[]> {
  return db.select().from(seams).where(eq(seams.type, type));
}

/**
 * Find seams suitable for a given fabric slug.
 * Matches by the fabric's weight_class against seam.suitable_weight_classes.
 */
export async function findSeamsForFabric(db: DatabaseClient, fabricSlug: string): Promise<Seam[]> {
  const fabricRows = await db
    .select({ weight_class: fabrics.weight_class })
    .from(fabrics)
    .where(eq(fabrics.id, fabricSlug))
    .limit(1);

  const weightClass = fabricRows[0]?.weight_class;
  if (!weightClass) return [];

  return db
    .select()
    .from(seams)
    .where(sql`${seams.suitable_weight_classes} @> ${JSON.stringify([weightClass])}::jsonb`);
}
