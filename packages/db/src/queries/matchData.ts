import { asc, eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { fabrics, projects } from "../schema";
import { withRetry } from "../utils/withRetry";

export type FabricForMatch = typeof fabrics.$inferSelect;
export type ProjectForMatch = typeof projects.$inferSelect;

/** Весь каталог тканей по алфавиту: их десятки, постраничность не нужна. */
export async function listFabricsForMatch(db: DatabaseClient): Promise<FabricForMatch[]> {
  return withRetry(() => db.select().from(fabrics).orderBy(asc(fabrics.name)));
}

/** Проект по slug (в сидах slug совпадает с id) или undefined. */
export async function findProjectForMatch(
  db: DatabaseClient,
  slug: string
): Promise<ProjectForMatch | undefined> {
  const rows = await withRetry(() =>
    db.select().from(projects).where(eq(projects.id, slug)).limit(1)
  );
  return rows[0];
}
