import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DatabaseClient } from "../client";
import { aiUsage } from "../schema";
import { withRetry } from "../utils/withRetry";

/**
 * Псевдоним таблицы расхода.
 *
 * Нужен для подзапроса «имя из самой свежей записи человека»: без псевдонима
 * подзапрос сравнивал бы колонку саму с собой и возвращал последнюю запись
 * вообще, а не по пользователю.
 */
const usage = alias(aiUsage, "usage_row");

/** Запись о расходе токенов. */
export interface UsageInput {
  /** Кто спрашивал: `tg:<id>` или `web:<id>`. */
  userKey: string;
  /** Имя или ник человека, если известен. */
  userLabel?: string | null;
  /** Откуда запрос: `web` или `bot`. */
  source: string;
  /** Чем воспользовались: `catalog`, `search`, `reason`, `research`. */
  feature: string;
  /** Режим ответа: `short`, `steps`, `why`. */
  mode?: string | null;
  /** Модель, которая дала ответ. */
  model?: string | null;
  /** Токены вопроса. */
  promptTokens?: number;
  /** Токены ответа. */
  completionTokens?: number;
  /** Всего токенов. */
  totalTokens?: number;
  /** Счётчик посчитан приблизительно. */
  estimated?: boolean;
  /** Ответ взят из кэша: модель не звали. */
  cached?: boolean;
  /** Диалог, в котором был задан вопрос. */
  conversationId?: string | null;
}

/** Период отчёта. */
export interface UsageRange {
  /** Начало периода включительно. */
  from: Date;
  /** Конец периода не включается. */
  to: Date;
}

/** Итоги по расходу. */
export interface UsageTotals {
  /** Сколько было запросов. */
  requests: number;
  /** Токены на вопросы. */
  promptTokens: number;
  /** Токены на ответы. */
  completionTokens: number;
  /** Всего токенов. */
  totalTokens: number;
}

/** Расход по одной функции помощника. */
export interface UsageByFeature extends UsageTotals {
  feature: string;
}

/** Расход по источнику: сайт или бот. */
export interface UsageBySource extends UsageTotals {
  source: string;
}

/** Расход по одному пользователю. */
export interface UsageUser extends UsageTotals {
  userKey: string;
  /** Имя или ник: берётся из самой свежей записи. */
  userLabel: string | null;
  /** Когда человек последний раз спрашивал. */
  lastSeen: Date;
}

/** Расход по дням: для графика в отчёте. */
export interface UsageByDay extends UsageTotals {
  /** День в формате `ГГГГ-ММ-ДД`. */
  day: string;
}

/** Одна запись о расходе. */
export interface UsageRecord {
  id: string;
  userKey: string;
  userLabel: string | null;
  source: string;
  feature: string;
  mode: string | null;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated: boolean;
  cached: boolean;
  createdAt: Date;
}

/**
 * Сохраняет запись о расходе токенов.
 *
 * Ошибка записи не должна ломать ответ: человек уже получил его. Поэтому
 * функция возвращает признак успеха, а вызывающий молча продолжает работу.
 */
export async function recordUsage(db: DatabaseClient, input: UsageInput): Promise<boolean> {
  try {
    await withRetry(() =>
      db.insert(aiUsage).values({
        id: crypto.randomUUID(),
        user_key: input.userKey,
        user_label: input.userLabel ?? null,
        source: input.source,
        feature: input.feature,
        mode: input.mode ?? null,
        model: input.model ?? null,
        prompt_tokens: input.promptTokens ?? 0,
        completion_tokens: input.completionTokens ?? 0,
        total_tokens: input.totalTokens ?? 0,
        estimated: input.estimated ?? false,
        cached: input.cached ?? false,
        conversation_id: input.conversationId ?? null,
      })
    );
    return true;
  } catch (err) {
    console.error("[usage] запись о расходе не сохранилась", {
      name: err instanceof Error ? err.name : "unknown",
    });
    return false;
  }
}

/** Суммы расхода за период. */
export async function usageTotals(db: DatabaseClient, range: UsageRange): Promise<UsageTotals> {
  const rows = await withRetry(() =>
    db
      .select({
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsage.total_tokens}), 0)::int`,
      })
      .from(aiUsage)
      .where(and(gte(aiUsage.created_at, range.from), lt(aiUsage.created_at, range.to)))
  );
  return rows[0] ?? { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

/** Расход по функциям помощника: каталог, поиск, рассуждение, ресёрч. */
export async function usageByFeature(
  db: DatabaseClient,
  range: UsageRange
): Promise<UsageByFeature[]> {
  const rows = await withRetry(() =>
    db
      .select({
        feature: aiUsage.feature,
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsage.total_tokens}), 0)::int`,
      })
      .from(aiUsage)
      .where(and(gte(aiUsage.created_at, range.from), lt(aiUsage.created_at, range.to)))
      .groupBy(aiUsage.feature)
      .orderBy(desc(sql`coalesce(sum(${aiUsage.total_tokens}), 0)`))
  );
  return rows;
}

/** Расход по источнику: сайт или Telegram-бот. */
export async function usageBySource(
  db: DatabaseClient,
  range: UsageRange
): Promise<UsageBySource[]> {
  const rows = await withRetry(() =>
    db
      .select({
        source: aiUsage.source,
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsage.total_tokens}), 0)::int`,
      })
      .from(aiUsage)
      .where(and(gte(aiUsage.created_at, range.from), lt(aiUsage.created_at, range.to)))
      .groupBy(aiUsage.source)
      .orderBy(desc(sql`coalesce(sum(${aiUsage.total_tokens}), 0)`))
  );
  return rows;
}

/** Кто сколько потратил: список по убыванию расхода. */
export async function usageTopUsers(
  db: DatabaseClient,
  range: UsageRange,
  limit = 10
): Promise<UsageUser[]> {
  const rows = await withRetry(() =>
    db
      .select({
        userKey: usage.user_key,
        // Имя берётся из самой свежей записи человека: оно могло измениться.
        userLabel: sql<string | null>`(
          select ${aiUsage.user_label} from ${aiUsage}
          where ${aiUsage.user_key} = ${usage.user_key}
          order by ${aiUsage.created_at} desc limit 1
        )`,
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${usage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${usage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${usage.total_tokens}), 0)::int`,
        lastSeen: sql<Date>`max(${usage.created_at})`,
      })
      .from(usage)
      .where(and(gte(usage.created_at, range.from), lt(usage.created_at, range.to)))
      .groupBy(usage.user_key)
      .orderBy(desc(sql`coalesce(sum(${usage.total_tokens}), 0)`))
      .limit(limit)
  );
  return rows;
}

/** Расход по дням периода. */
export async function usageByDay(db: DatabaseClient, range: UsageRange): Promise<UsageByDay[]> {
  const rows = await withRetry(() =>
    db
      .select({
        day: sql<string>`to_char(${aiUsage.created_at} at time zone 'Europe/Moscow', 'YYYY-MM-DD')`,
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsage.total_tokens}), 0)::int`,
      })
      .from(aiUsage)
      .where(and(gte(aiUsage.created_at, range.from), lt(aiUsage.created_at, range.to)))
      .groupBy(sql`to_char(${aiUsage.created_at} at time zone 'Europe/Moscow', 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${aiUsage.created_at} at time zone 'Europe/Moscow', 'YYYY-MM-DD')`)
  );
  return rows;
}

/** Расход одного пользователя: итоги, разбивка по функциям и последние запросы. */
export async function usageForUser(
  db: DatabaseClient,
  userKey: string,
  range: UsageRange
): Promise<{
  totals: UsageTotals;
  byFeature: UsageByFeature[];
  recent: UsageRecord[];
}> {
  const totals = await usageTotalsForUser(db, userKey, range);
  const byFeature = await withRetry(() =>
    db
      .select({
        feature: aiUsage.feature,
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsage.total_tokens}), 0)::int`,
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.user_key, userKey),
          gte(aiUsage.created_at, range.from),
          lt(aiUsage.created_at, range.to)
        )
      )
      .groupBy(aiUsage.feature)
      .orderBy(desc(sql`coalesce(sum(${aiUsage.total_tokens}), 0)`))
  );
  const recent = await withRetry(() =>
    db
      .select({
        id: aiUsage.id,
        userKey: aiUsage.user_key,
        userLabel: aiUsage.user_label,
        source: aiUsage.source,
        feature: aiUsage.feature,
        mode: aiUsage.mode,
        model: aiUsage.model,
        promptTokens: aiUsage.prompt_tokens,
        completionTokens: aiUsage.completion_tokens,
        totalTokens: aiUsage.total_tokens,
        estimated: aiUsage.estimated,
        cached: aiUsage.cached,
        createdAt: aiUsage.created_at,
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.user_key, userKey),
          gte(aiUsage.created_at, range.from),
          lt(aiUsage.created_at, range.to)
        )
      )
      .orderBy(desc(aiUsage.created_at))
      .limit(20)
  );
  return { totals, byFeature, recent };
}

/** Итоги расхода одного пользователя. */
async function usageTotalsForUser(
  db: DatabaseClient,
  userKey: string,
  range: UsageRange
): Promise<UsageTotals> {
  const rows = await withRetry(() =>
    db
      .select({
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${aiUsage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${aiUsage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${aiUsage.total_tokens}), 0)::int`,
      })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.user_key, userKey),
          gte(aiUsage.created_at, range.from),
          lt(aiUsage.created_at, range.to)
        )
      )
  );
  return rows[0] ?? { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

/** Ищет пользователя по части ключа: `tg:123` или имени. */
export async function findUsers(
  db: DatabaseClient,
  query: string,
  limit = 10
): Promise<UsageUser[]> {
  const rows = await withRetry(() =>
    db
      .select({
        userKey: usage.user_key,
        userLabel: sql<string | null>`(
          select ${aiUsage.user_label} from ${aiUsage}
          where ${aiUsage.user_key} = ${usage.user_key}
          order by ${aiUsage.created_at} desc limit 1
        )`,
        requests: sql<number>`count(*)::int`,
        promptTokens: sql<number>`coalesce(sum(${usage.prompt_tokens}), 0)::int`,
        completionTokens: sql<number>`coalesce(sum(${usage.completion_tokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${usage.total_tokens}), 0)::int`,
        lastSeen: sql<Date>`max(${usage.created_at})`,
      })
      .from(usage)
      .where(sql`${usage.user_key} ilike ${`%${query}%`}`)
      .groupBy(usage.user_key)
      .orderBy(desc(sql`max(${usage.created_at})`))
      .limit(limit)
  );
  return rows;
}

/** Последние записи о расходе: для выгрузки в таблицу. */
export async function recentUsage(
  db: DatabaseClient,
  range: UsageRange,
  limit = 100
): Promise<UsageRecord[]> {
  const rows = await withRetry(() =>
    db
      .select({
        id: aiUsage.id,
        userKey: aiUsage.user_key,
        userLabel: aiUsage.user_label,
        source: aiUsage.source,
        feature: aiUsage.feature,
        mode: aiUsage.mode,
        model: aiUsage.model,
        promptTokens: aiUsage.prompt_tokens,
        completionTokens: aiUsage.completion_tokens,
        totalTokens: aiUsage.total_tokens,
        estimated: aiUsage.estimated,
        cached: aiUsage.cached,
        createdAt: aiUsage.created_at,
      })
      .from(aiUsage)
      .where(and(gte(aiUsage.created_at, range.from), lt(aiUsage.created_at, range.to)))
      .orderBy(desc(aiUsage.created_at))
      .limit(limit)
  );
  return rows;
}
