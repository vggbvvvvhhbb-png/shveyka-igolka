import { eq, and, sql, count, asc, type SQL, type SQLChunk } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { fabrics } from "../schema";
import type { WeightClass } from "@shveyka/core";
import { normalizeSearchText, searchSkeleton } from "@shveyka/core";
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
 * Поля, по которым допускается приближённое совпадение по «скелету» слова.
 *
 * Только те, что называют саму ткань: в свободных текстах вроде ухода или
 * типичных проблем приближённое совпадение даёт слишком много шума.
 */
const IDENTITY_FIELDS: readonly SearchField[] = ["name", "aliases"];

/**
 * Минимальная длина слова, с которой включается приближённое совпадение.
 * У коротких слов «скелет» слишком короткий и совпал бы с кем угодно.
 */
const MIN_APPROXIMATE_LENGTH = 3;

/** Минимальная длина «скелета», с которой он вообще что-то значит. */
const MIN_SKELETON_LENGTH = 2;

/**
 * Приводит значение БД к общему виду: нижний регистр, «ё» → «е», «ъ» → «ь».
 *
 * Так поиск не зависит от того, как слово записано в каталоге: «ё» и «е»
 * считаются одной буквой, и запрос «из льна» находит ткань «Лён».
 */
function normalizeSql(expr: SQLChunk): SQL {
  return sql`lower(translate(${expr}, 'ёЁъЪ', 'еЕьЬ'))`;
}

/**
 * «Скелет» слова на стороне БД: согласные без мягкого знака.
 * Соответствует searchSkeleton из @shveyka/core.
 */
function skeletonSql(expr: SQLChunk): SQL {
  return sql`regexp_replace(${normalizeSql(expr)}, '[аеиоуыэюяь]', '', 'g')`;
}

/**
 * Экранирует спецсимволы LIKE/ILIKE («%», «_», «\»), чтобы в запросе они
 * искались буквально, а не работали как wildcards.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/([\\%_])/g, "\\$1");
}

/**
 * Шаблоны LIKE для одного поискового слова.
 *
 * exact — совпадение по нормализованному тексту.
 * skeleton — совпадение по «скелету» слова; нужно, чтобы падежные формы
 * («льня», «льна») находили запись «Лён». null, если скелет слишком короткий.
 */
type TermPatterns = {
  exact: string;
  skeleton: string | null;
};

/**
 * Приводит поисковые слова к экранированным паттернам. Пустые слова
 * отбрасываются: по ним условие поиска строиться не должно.
 */
function toPatterns(terms: string[]): TermPatterns[] {
  const patterns: TermPatterns[] = [];

  for (const term of terms) {
    const trimmed = term.trim();
    if (trimmed.length === 0) continue;
    patterns.push({
      exact: `%${escapeLikePattern(trimmed)}%`,
      skeleton: buildSkeletonPattern(trimmed),
    });
  }

  return patterns;
}

/**
 * «Скелет» поискового слова для приближённого совпадения.
 *
 * Возвращает null, если скелет слишком короткий: у коротких слов он совпал бы
 * с кем угодно. Минимум — две буквы, этого хватает для «лён» → «льня».
 */
function buildSkeletonPattern(term: string): string | null {
  if (normalizeSearchText(term).length < MIN_APPROXIMATE_LENGTH) return null;
  const skeleton = searchSkeleton(term);
  if (skeleton.length < MIN_SKELETON_LENGTH) return null;
  return skeleton;
}

/**
 * Условие точного совпадения по одному полю: и значение поля, и шаблон
 * приводятся к общему виду, поэтому «ё» и «е» считаются одной буквой.
 */
function matchesExact(pattern: string, field: SearchField): SQL {
  switch (field) {
    case "name":
      return sql`${normalizeSql(fabrics.name)} ILIKE ${normalizeSql(pattern)}`;
    case "aliases":
      return sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${fabrics.aliases}) AS alias_value
        WHERE ${normalizeSql(sql`alias_value`)} ILIKE ${normalizeSql(pattern)}
      )`;
    case "composition":
      return sql`${normalizeSql(fabrics.composition)} ILIKE ${normalizeSql(pattern)}`;
    case "care":
      return sql`${normalizeSql(fabrics.care_instructions)} ILIKE ${normalizeSql(pattern)}`;
    case "issues":
      return sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${fabrics.common_issues}) AS issue_value
        WHERE ${normalizeSql(sql`issue_value`)} ILIKE ${normalizeSql(pattern)}
      )`;
  }
}

/**
 * Приближённое совпадение по «скелету» слова.
 *
 * Два направления: скелет поля начинается со скелета запроса и наоборот.
 * Первое ловит падежные формы («льня» → «лён»), второе — запрос длиннее
 * записи («хлопковая» → «Хлопок»).
 */
function matchesSkeleton(skeleton: string, field: SearchField): SQL {
  const pattern = `${escapeLikePattern(skeleton)}%`;

  switch (field) {
    case "name":
      return sql`(
        ${skeletonSql(fabrics.name)} ILIKE ${pattern}
        OR ${skeleton} ILIKE (nullif(${skeletonSql(fabrics.name)}, '') || '%')
      )`;
    case "aliases":
      return sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${fabrics.aliases}) AS alias_value
        WHERE ${skeletonSql(sql`alias_value`)} ILIKE ${pattern}
           OR ${skeleton} ILIKE (nullif(${skeletonSql(sql`alias_value`)}, '') || '%')
      )`;
    default:
      // Приближённое совпадение разрешено только для полей, которые называют
      // саму ткань: в свободных текстах оно даёт слишком много шума.
      return sql`false`;
  }
}

/**
 * Условие совпадения поискового слова по полю: точное совпадение плюс
 * приближённое по «скелету» слова, если поле называет саму ткань.
 */
function matchesTerm(pattern: TermPatterns, field: SearchField): SQL {
  const conditions: SQL[] = [matchesExact(pattern.exact, field)];

  if (pattern.skeleton && IDENTITY_FIELDS.includes(field)) {
    conditions.push(matchesSkeleton(pattern.skeleton, field));
  }

  return sql.join(conditions, sql` OR `);
}

/**
 * Общее условие поиска: ткань подходит, если хотя бы одно из слов совпало
 * хотя бы по одному полю. Используется и веб-поиском на /fabrics, и AI-поиском
 * в searchContext — чтобы поведение двух поисков не расходилось.
 */
function buildSearchCondition(patterns: TermPatterns[]): SQL | undefined {
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
function buildRelevanceSql(patterns: TermPatterns[]): SQL {
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
