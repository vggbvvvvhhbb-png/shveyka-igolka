import { eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { fabrics } from "../schema";
import type { WeightClass, GarmentType } from "@shveyka/core";

export type Fabric = typeof fabrics.$inferSelect;

/**
 * Get a single fabric by its slug id.
 */
export async function getFabricById(db: DatabaseClient, id: string): Promise<Fabric | undefined> {
  const rows = await db.select().from(fabrics).where(eq(fabrics.id, id)).limit(1);
  return rows[0];
}

/**
 * List fabrics with optional filters.
 */
export async function listFabrics(
  db: DatabaseClient,
  filters?: {
    weightClass?: WeightClass;
    category?: string;
    stretch?: string;
    suitableFor?: GarmentType;
  }
): Promise<Fabric[]> {
  let query = db.select().from(fabrics).$dynamic();

  if (filters?.weightClass) {
    query = query.where(eq(fabrics.weight_class, filters.weightClass));
  }
  if (filters?.category) {
    query = query.where(eq(fabrics.category, filters.category));
  }
  if (filters?.stretch) {
    query = query.where(eq(fabrics.stretch, filters.stretch));
  }
  if (filters?.suitableFor) {
    query = query.where(
      sql`${fabrics.suitable_for} @> ${JSON.stringify([filters.suitableFor])}::jsonb`
    );
  }

  return query;
}

/**
 * Find fabrics whose name or aliases contain the query string (case-insensitive).
 */
export async function findFabricsByAliases(
  db: DatabaseClient,
  queryStr: string
): Promise<Fabric[]> {
  const likePattern = `%${queryStr}%`;
  return db
    .select()
    .from(fabrics)
    .where(
      sql`(${fabrics.name} ILIKE ${likePattern}) OR (
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${fabrics.aliases}) AS alias
          WHERE alias ILIKE ${likePattern}
        )
      )`
    );
}
