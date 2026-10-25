# 01. `seed:fresh` действительно перезаливает

**Проблема (D1).** `seed:fresh` запускает `seed.ts --fresh`, но argv не читается: удалённая из JSON запись остаётся в БД навсегда.

## Решение

- `packages/core/src/catalog/syncPlan.ts` — чистая функция `planSync(existing, incoming)` → что удалить. Пустые сиды и дубли id — **ошибка**, а не «удалить всё»: битый JSON не обнулит каталог.
- `packages/db/src/seedSync.ts` — `parseSeedArgs` и `pruneCatalog`. Все три таблицы в **одной транзакции**: если сиды любой из них неисправны, не удаляется ничего.
- Удаление идёт **до** upsert, обычный `pnpm seed` не меняется.
- `--dry-run` показывает, что будет удалено, и ничего не трогает.

## Подключение в `packages/db/src/seed.ts`

```ts
import { parseSeedArgs, pruneCatalog } from "./seedSync";

const args = parseSeedArgs(process.argv.slice(2));

if (args.fresh) {
  const reports = await pruneCatalog(
    db,
    [
      { name: "fabrics", table: fabrics, id: fabrics.id, keep: fabricsSeed.map((x) => x.id) },
      { name: "seams", table: seams, id: seams.id, keep: seamsSeed.map((x) => x.id) },
      { name: "projects", table: projects, id: projects.id, keep: projectsSeed.map((x) => x.id) },
    ],
    args.dryRun
  );
  for (const r of reports) {
    console.log(
      `[seed:fresh] ${r.name}: удалено ${r.deleted.length}${r.deleted.length ? ` (${r.deleted.join(", ")})` : ""}`
    );
  }
  if (args.dryRun) process.exit(0);
}
// ...существующий upsert без изменений; в конце: console.log(`[seed] залито: ...`)
```

`fabricsSeed` и т. д. — уже загруженные из `packages/db/data/*.json` массивы. Если ключ — `slug`, замените `.id` на `.slug`.

## Тесты

`seedSync.test.ts` (PGlite): удаляет запись, которой нет в сидах · dry-run не удаляет · пустые сиды откатывают всё · разбор флагов. Логика плана — `syncPlan.test.ts`.

## Уборка (D8)

`scripts/chore-cleanup.sh` удаляет `pg-mem` из `devDependencies` и чистит `.temp/`.

## Риск

Удаление записи, на которую есть FK из другой таблицы, упадёт с понятной ошибкой Postgres, и транзакция откатится. Сейчас в схеме такой связи нет (ссылки между сидами — массивы id).

README/AGENTS.md не трогать: формулировка «полная перезаливка» после правки соответствует поведению.
