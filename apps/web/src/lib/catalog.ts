import { fabrics, getDbSingleton, projects, seams, withRetry } from "@shveyka/db";
import {
  buildCatalogGraph,
  toFabricNode,
  toProjectNode,
  toSeamNode,
  type CatalogGraph,
  type Row,
} from "@shveyka/core";

export interface Catalog {
  rows: { fabric: Row[]; seam: Row[]; project: Row[] };
  graph: CatalogGraph;
}

/** Каталог меняется только сидами — минутного кэша хватает, чтобы страницы не дёргали БД трижды. */
const TTL_MS = 60_000;

let cached: { at: number; value: Catalog } | null = null;

/**
 * Загружает каталог целиком и строит граф связей.
 *
 * Каталог маленький (десятки записей), поэтому проще взять его целиком и
 * отдать страницам готовые связи, чем ходить в БД за каждой ссылкой отдельно.
 */
export async function loadCatalog(): Promise<Catalog> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return cached.value;
  }

  const db = getDbSingleton();
  const [f, s, p] = await Promise.all([
    withRetry(() => db.select().from(fabrics)),
    withRetry(() => db.select().from(seams)),
    withRetry(() => db.select().from(projects)),
  ]);

  const rows = {
    fabric: f as unknown as Row[],
    seam: s as unknown as Row[],
    project: p as unknown as Row[],
  };

  const value: Catalog = {
    rows,
    graph: buildCatalogGraph({
      fabrics: rows.fabric.map(toFabricNode),
      seams: rows.seam.map(toSeamNode),
      projects: rows.project.map(toProjectNode),
    }),
  };

  cached = { at: now, value };
  return value;
}
