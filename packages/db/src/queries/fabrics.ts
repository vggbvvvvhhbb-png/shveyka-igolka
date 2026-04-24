import { eq, and, ilike, sql, count } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { fabrics } from "../schema";
import type { WeightClass } from "@shveyka/core";
import { withRetry } from "../utils/withRetry";

export type Fabric = typeof fabrics.$inferSelect;

export type FabricFilters = {
  category?: string;
  weight?: WeightClass;
  stretch?: string;
  q?: string;
};

function buildWhereConditions(filters: FabricFilters) {
  const conditions = [];

  if (filters.category) {
    conditions.push(eq(fabrics.category, filters.category));
  }
  if (filters.weight) {
    conditions.push(eq(fabrics.weight_class, filters.weight));
  }
  if (filters.stretch) {
    conditions.push(eq(fabrics.stretch, filters.stretch));
  }
  if (filters.q) {
    conditions.push(ilike(fabrics.name, `%${filters.q}%`));
  }

  return conditions;
}

/**
 * Search fabrics with optional filters.
 */
export async function searchFabrics(
  db: DatabaseClient,
  filters: FabricFilters = {}
): Promise<Fabric[]> {
  const conditions = buildWhereConditions(filters);

  if (conditions.length === 0) {
    return withRetry(() => db.select().from(fabrics));
  }

  return withRetry(() =>
    db
      .select()
      .from(fabrics)
      .where(and(...conditions))
  );
}

/**
 * Count fabrics matching filters.
 */
export async function countFabrics(
  db: DatabaseClient,
  filters: FabricFilters = {}
): Promise<number> {
  const conditions = buildWhereConditions(filters);

  const result = await withRetry(() =>
    db
      .select({ value: count() })
      .from(fabrics)
      .where(conditions.length ? and(...conditions) : undefined)
  );

  return result[0]?.value ?? 0;
}

/**
 * Get a single fabric by its slug id.
 */
export async function getFabricBySlug(db: DatabaseClient, slug: string): Promise<Fabric | null> {
  const rows = await withRetry(() =>
    db.select().from(fabrics).where(eq(fabrics.id, slug)).limit(1)
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Legacy exports (kept for backward compatibility)
// ---------------------------------------------------------------------------

/**
 * Get a single fabric by its slug id.
 * @deprecated Use getFabricBySlug instead.
 */
export async function getFabricById(db: DatabaseClient, id: string): Promise<Fabric | undefined> {
  const rows = await withRetry(() => db.select().from(fabrics).where(eq(fabrics.id, id)).limit(1));
  return rows[0];
}

/**
 * List fabrics with optional filters.
 * @deprecated Use searchFabrics instead.
 */
export async function listFabrics(
  db: DatabaseClient,
  filters?: {
    weightClass?: WeightClass;
    category?: string;
    stretch?: string;
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

  return withRetry(() => query);
}

/**
 * Find fabrics whose name or aliases contain the query string (case-insensitive).
 * @deprecated Use searchFabrics with q instead.
 */
export async function findFabricsByAliases(
  db: DatabaseClient,
  queryStr: string
): Promise<Fabric[]> {
  const likePattern = `%${queryStr}%`;
  return withRetry(() =>
    db
      .select()
      .from(fabrics)
      .where(
        sql`(${fabrics.name} ILIKE ${likePattern}) OR (
          EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${fabrics.aliases}) AS alias
            WHERE alias ILIKE ${likePattern}
          )
        )`
      )
  );
}
