import { fabrics, getDbSingleton, projects, seams, withRetry } from "@shveyka/db";
import {
  buildCatalogGraph,
  computeCatalogVersion,
  field,
  str,
  strList,
  toFabricNode,
  toProjectNode,
  toSeamNode,
  type CatalogGraph,
  type PoolEntry,
  type Row,
} from "@shveyka/core";

export interface Catalog {
  rows: { fabric: Row[]; seam: Row[]; project: Row[] };
  graph: CatalogGraph;
  /** Максимальный updated_at по каталогу: lastModified в sitemap и ключ кэша ответов. */
  version: string;
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
    version: computeCatalogVersion(
      [...rows.fabric, ...rows.seam, ...rows.project].map(
        (r) => field(r, "updated_at") as string | Date | null
      )
    ),
  };

  cached = { at: now, value };
  return value;
}

/** Ссылка на запись может быть записана и как id, и как slug. */
const slugOf = (r: Row): string => str(r, "slug") || str(r, "id");

/**
 * Весь каталог в плоском виде — для подсказок, когда точного ответа нет.
 *
 * Модель получает эти записи, когда в контексте не нашлось ничего: так она
 * предлагает ближайшее, а не отказывает.
 */
export function poolOf(c: Catalog): PoolEntry[] {
  const mk = (kind: PoolEntry["kind"], rows: Row[]): PoolEntry[] =>
    rows.map((r) => ({
      kind,
      slug: slugOf(r),
      name: str(r, "name"),
      aliases: strList(r, "aliases"),
    }));

  return [
    ...mk("fabric", c.rows.fabric),
    ...mk("seam", c.rows.seam),
    ...mk("project", c.rows.project),
  ];
}
