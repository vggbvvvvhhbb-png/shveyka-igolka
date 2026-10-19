import { eq, and, sql, count, asc, type SQL } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { fabrics } from "../schema";
import type { WeightClass } from "@shveyka/core";
import { withRetry } from "../utils/withRetry";

export type Fabric = typeof fabrics.$inferSelect;

export type FabricSort = "name" | "weight" | "difficulty";

export type FabricFilters = {
  category?: string;
  weight?: WeightClass;
  stretch?: string;
  q?: string;
  sort?: FabricSort;
  limit?: number;
  offset?: number;
};

/**
 * Порядок тканей по весу: от лёгких к тяжёлым. Лексикографически
 * «very_heavy» шёл бы раньше «light», поэтому порядок задан явно.
 */
const WEIGHT_ORDER = sql<number>`CASE ${fabrics.weight_class}
  WHEN 'light' THEN 1
  WHEN 'medium' THEN 2
  WHEN 'heavy' THEN 3
  WHEN 'very_heavy' THEN 4
  ELSE 5
END`;

/**
 * Порядок тканей по сложности работы: от простых к сложным.
 */
const DIFFICULTY_ORDER = sql<number>`CASE ${fabrics.difficulty_to_work_with}
  WHEN 'beginner' THEN 1
  WHEN 'intermediate' THEN 2
  WHEN 'advanced' THEN 3
  ELSE 4
END`;

/**
 * Порядок выдачи без учёта релевантности поиска.
 */
function buildSortSql(sort: FabricSort | undefined): SQL {
  switch (sort) {
    case "weight":
      return WEIGHT_ORDER;
    case "difficulty":
      return DIFFICULTY_ORDER;
    case "name":
    default:
      return asc(fabrics.name);
  }
}

/**
 * Поля, по которым ищется ткань, в порядке убывания релевантности.
 * Совпадение по названию важнее совпадения по составу.
 */
const SEARCH_FIELDS = ["name", "aliases", "composition", "care", "issues"] as const;

type SearchField = (typeof SEARCH_FIELDS)[number];

/**
 * Экранирует спецсимволы LIKE/ILIKE («%», «_», «\»), чтобы в запросе они
 * искались буквально, а не работали как wildcards.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/([\\%_])/g, "\\$1");
}

/**
 * Приводит поисковые слова к экранированным паттернам. Пустые слова
 * отбрасываются: по ним условие поиска строиться не должно.
 */
function toPatterns(terms: string[]): string[] {
  const patterns: string[] = [];
  for (const term of terms) {
    const trimmed = term.trim();
    if (trimmed.length === 0) continue;
    patterns.push(`%${escapeLikePattern(trimmed)}%`);
  }
  return patterns;
}

/**
 * Условие совпадения по одному полю. Для jsonb-массивов используется
 * jsonb_array_elements_text, чтобы искать по каждому элементу отдельно.
 */
function matchesTerm(pattern: string, field: SearchField): SQL {
  switch (field) {
    case "name":
      return sql`${fabrics.name} ILIKE ${pattern}`;
    case "aliases":
      return sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${fabrics.aliases}) AS alias
        WHERE alias ILIKE ${pattern}
      )`;
    case "composition":
      return sql`${fabrics.composition} ILIKE ${pattern}`;
    case "care":
      return sql`${fabrics.care_instructions} ILIKE ${pattern}`;
    case "issues":
      return sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${fabrics.common_issues}) AS issue
        WHERE issue ILIKE ${pattern}
      )`;
  }
}

/**
 * Общее условие поиска: ткань подходит, если хотя бы одно из слов совпало
 * хотя бы по одному полю. Используется и веб-поиском на /fabrics, и AI-поиском
 * в searchContext — чтобы поведение двух поисков не расходилось.
 */
function buildSearchCondition(patterns: string[]): SQL | undefined {
  if (patterns.length === 0) return undefined;

  const parts: SQL[] = [];
  for (const pattern of patterns) {
    for (const field of SEARCH_FIELDS) {
      parts.push(matchesTerm(pattern, field));
    }
  }

  return sql`(${sql.join(parts, sql` OR `)})`;
}

/**
 * Ранг релевантности: 1 — совпадение по названию, 2 — по алиасу,
 * 3 — по составу, 4 — по уходу, 5 — по типичным проблемам.
 */
function buildRelevanceSql(patterns: string[]): SQL {
  const byField = (field: SearchField): SQL =>
    sql.join(
      patterns.map((pattern) => matchesTerm(pattern, field)),
      sql` OR `
    );

  return sql<number>`CASE
    WHEN ${byField("name")} THEN 1
    WHEN ${byField("aliases")} THEN 2
    WHEN ${byField("composition")} THEN 3
    WHEN ${byField("care")} THEN 4
    WHEN ${byField("issues")} THEN 5
    ELSE 6
  END`;
}

function buildWhereConditions(filters: FabricFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.category) {
    conditions.push(eq(fabrics.category, filters.category));
  }
  if (filters.weight) {
    conditions.push(eq(fabrics.weight_class, filters.weight));
  }
  if (filters.stretch) {
    conditions.push(eq(fabrics.stretch, filters.stretch));
  }

  const search = buildSearchCondition(toPatterns(filters.q ? [filters.q] : []));
  if (search) {
    conditions.push(search);
  }

  return conditions;
}

/**
 * Search fabrics with optional filters.
 * При заданном q результат отсортирован по релевантности, при равной
 * релевантности — по названию.
 */
export async function searchFabrics(
  db: DatabaseClient,
  filters: FabricFilters = {}
): Promise<Fabric[]> {
  const conditions = buildWhereConditions(filters);
  const patterns = toPatterns(filters.q ? [filters.q] : []);

  return withRetry(() => {
    const query = db.select().from(fabrics);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const orderBy: SQL[] = [];
    if (patterns.length > 0) {
      orderBy.push(buildRelevanceSql(patterns));
    }
    orderBy.push(buildSortSql(filters.sort));
    query.orderBy(...orderBy);

    if (filters.limit !== undefined) {
      query.limit(filters.limit);
    }
    if (filters.offset !== undefined) {
      query.offset(filters.offset);
    }

    return query;
  });
}

/**
 * Count fabrics matching filters.
 * Использует те же условия, что и searchFabrics, поэтому число всегда
 * совпадает с длиной выдачи.
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
 * Ищет ткани по нескольким ключевым словам сразу: совпадение по любому из
 * слов считается совпадением, приоритет — по названию, затем по алиасу.
 *
 * Дубликаты невозможны: запрос возвращает по одной строке на ткань.
 */
export async function searchFabricsByKeywords(
  db: DatabaseClient,
  keywords: string[],
  limit?: number
): Promise<Fabric[]> {
  const patterns = toPatterns(keywords);
  const search = buildSearchCondition(patterns);

  if (!search) return [];

  return withRetry(() => {
    const query = db
      .select()
      .from(fabrics)
      .where(search)
      .orderBy(buildRelevanceSql(patterns), asc(fabrics.name));

    return limit === undefined ? query : query.limit(limit);
  });
}

/**
 * Ищет ткани по свободному запросу: название, алиасы, состав, уход и типичные
 * проблемы. Результат отсортирован по релевантности.
 */
export async function searchFabricsByQuery(db: DatabaseClient, query: string): Promise<Fabric[]> {
  return searchFabricsByKeywords(db, [query]);
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
