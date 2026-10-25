import { inArray } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { planSync } from "@shveyka/core";
import type { DatabaseClient } from "./client";
import { withRetry } from "./utils/withRetry";

/** Таблица каталога, из которой можно убрать записи, исчезнувшие из сидов. */
export interface PruneTarget {
  /** Имя таблицы — для вывода в лог сида. */
  name: string;
  table: PgTable;
  /** Колонка с идентификатором записи. */
  id: PgColumn;
  /** Идентификаторы, которые должны остаться (пришли из сидов). */
  keep: readonly string[];
}

/** Что именно было удалено из одной таблицы. */
export interface PruneReport {
  name: string;
  deleted: string[];
}

/** Аргументы запуска сида. */
export interface SeedArgs {
  /** Полная перезаливка: удалить из БД то, чего больше нет в сидах. */
  fresh: boolean;
  /** Только показать, что будет удалено, ничего не меняя. */
  dryRun: boolean;
}

/**
 * Разбирает аргументы командной строки сида.
 *
 * `--dry-run` имеет смысл только вместе с `--fresh`: без перезаливки
 * нечего показывать, поэтому лишний флаг просто игнорируется.
 */
export function parseSeedArgs(argv: readonly string[]): SeedArgs {
  const fresh = argv.includes("--fresh");
  return { fresh, dryRun: fresh && argv.includes("--dry-run") };
}

/**
 * Удаляет из таблиц каталога записи, которых больше нет в сидах.
 *
 * Обычный `pnpm seed` только добавляет и обновляет — поэтому удалённая из
 * JSON запись навсегда оставалась в БД. Здесь она наконец убирается.
 *
 * Всё делается одной транзакцией: если что-то не удалилось, не удаляется
 * ничего. Транзакция целиком оборачивается в `withRetry` — повторять
 * отдельные запросы внутри транзакции нельзя, после ошибки она уже отменена.
 *
 * @param dryRun — только посчитать, что будет удалено, ничего не меняя.
 */
export async function pruneCatalog(
  db: DatabaseClient,
  targets: readonly PruneTarget[],
  dryRun = false
): Promise<PruneReport[]> {
  const reports: PruneReport[] = [];

  await withRetry(() =>
    db.transaction(async (tx) => {
      for (const target of targets) {
        const rows = await tx.select({ id: target.id }).from(target.table);
        const plan = planSync(
          rows.map((row) => String(row.id)),
          target.keep
        );

        if (plan.toDelete.length > 0 && !dryRun) {
          await tx.delete(target.table).where(inArray(target.id, plan.toDelete));
        }

        reports.push({ name: target.name, deleted: plan.toDelete });
      }
    })
  );

  return reports;
}
