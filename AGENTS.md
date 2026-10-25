# AGENTS.md — правила работы с репозиторием Shveyka

## Назначение

**Shveyka** — помощник по шитью на швейной машине Brother LS-200s: каталог тканей (35),
швов (16) и проектов (6) с подсказками по настройкам машины, плюс AI-консультант
(`/assistant`), который отвечает **строго по данным каталога** и не придумывает параметров.

Аудитория — домашние швеи. Все тексты интерфейса — на русском, тон спокойный и конкретный,
без снисходительности и без жаргона.

## Стек и структура

pnpm workspaces (pnpm 9.12) + Turborepo. Версии зависимостей зафиксированы в
`pnpm-workspace.yaml` (catalog) — сначала проверяй там, потом ставь новую зависимость.

| Пакет           | Содержит                          | Стек                                                          |
| --------------- | --------------------------------- | ------------------------------------------------------------- |
| `apps/web`      | страницы и API приложения         | Next.js 15 (App Router), React 19, Tailwind 4 (палитра stone) |
| `packages/core` | типы, Zod-схемы, чистая логика AI | zod 3.25, без React и без БД                                  |
| `packages/db`   | схема, запросы, сиды              | Drizzle ORM 0.36, pg 8.13, Postgres (Supabase)                |

```
apps/web/src/app/        page.tsx, layout.tsx, fabrics/ seams/ projects/ assistant/, api/chat/
apps/web/src/components/ Header, Footer, карточки каталогов, ChatWidget
apps/web/src/lib/        серверные fetcher'ы (React cache())
packages/core/src/ai/    contextSchema, requestSchema, systemPrompt, constants, parseLinks, routeLogic
packages/db/src/         schema.ts, client.ts, seed.ts, queries/, utils/withRetry.ts
packages/db/data/        fabrics.json, seams.json, projects.json — СИДЫ, править только через seed
knowledge.txt            эталонные TS-типы домена (Fabric / Seam / Project / MachineSettings)
docs/                    референсные материалы (см. docs/README.md)
```

## Команды

```bash
pnpm install --frozen-lockfile
pnpm dev              # Next.js dev-сервер (turbo → apps/web)
pnpm build            # production-сборка
pnpm lint             # eslint по всем пакетам
pnpm test             # vitest (все тесты сейчас в packages/db)
pnpm typecheck        # tsc --noEmit по каждому пакету
pnpm db:generate      # drizzle-kit generate — новая SQL-миграция
pnpm db:push          # drizzle-kit push — применить схему к БД из DATABASE_URL
pnpm seed             # залить сиды (upsert)
pnpm seed:fresh       # полная перезаливка сидов (удаляет то, чего больше нет в JSON)
pnpm seed:dry         # показать, что удалит seed:fresh, ничего не меняя
```

## Правила

1. **Границы пакетов.** `packages/core` не импортирует из `apps/*` и `packages/db`.
   Обратное (db → core) разрешено. Проверяй grep-ом перед коммитом.
2. **Тесты лежат рядом с кодом.** Логику `packages/core` тестирует `packages/core`,
   а не `packages/db`. В `packages/db` не должно быть тестов кода из `packages/core`.
3. **Чистая логика — в core.** Всё, что можно покрыть тестом без сети и без БД,
   живёт в `packages/core`, а не inline в роуте или компоненте.
4. **Каждый запрос к БД — через `withRetry`** (`packages/db/src/utils/withRetry.ts`).
5. **Сиды не править руками.** `packages/db/data/*.json` меняются только через
   `pnpm seed` / `pnpm seed:fresh`.
6. **Никаких `any`** и никаких заглушек `// TODO: реализовать`. Лучше не начать
   задачу, чем оставить её наполовину.
7. **Пользовательские строки — на русском.** Ошибки клиенту — обобщённые, без стектрейсов
   и внутренних деталей.
8. **Комментарии и doc-блоки — на русском**, в стиле существующих (`schema.ts`, `routeLogic.ts`).
9. **Перед написанием UI-текстов проверь `docs/`** — там лежат готовые тексты
   (`ux-copy.pdf`, `ux-copy.html`) и заметки по архитектуре. Если нужного файла нет,
   собери тексты сам в едином тоне и перечисли их в отчёте для ревью.
10. **Коммиты — conventional commits**, по одному на логическую задачу:
    `feat(web,core,db): …`, `fix(db): …`, `chore: …`.
11. **Не делай `git push` и не открывай PR без явной просьбы владельца.**
    Работай в ветке `feat/stage-N-<кратко>`.
12. **Не расширяй рамки задачи.** Никакой авторизации, таблицы пользователей, Redis
    и редизайна «заодно». Найденную проблему вне задачи — запиши в отчёт.

## Особенности, о которых нужно знать

- **Пул БД кешируется в `globalThis` во всех окружениях** (`packages/db/src/client.ts`).
  На serverless новый пул на каждый запрос исчерпывает лимит соединений Postgres.
  Обработчик `SIGTERM` регистрируется один раз на процесс; закрыть пул — `closeDbPool()`.
- **Rate limit в `/api/chat` живёт в памяти процесса** (20 запросов / 60 с на IP).
  При нескольких инстансах лимит не действует — см. ограничения в отчёте.
- **Тесты БД работают на PGlite** (`@electric-sql/pglite`), а не на pg-mem:
  это настоящий Postgres в WASM, поэтому поддерживает `jsonb_array_elements_text` и т.п.
- **Типы маршрутов Next.js лежат в `.next/types`** и генерируются при сборке.
  После переключения ветки там остаются файлы несуществующих маршрутов, и
  `tsc --noEmit` падает на них. Поэтому проверку типов в `apps/web` запускают
  через `pnpm typecheck`: скрипт `scripts/prepare-types.mjs` перегенерирует
  общие типы (`next typegen`) и убирает устаревшие. Голый `tsc --noEmit`
  без подготовки может ругаться на старые файлы.
- **`docs/README.md` не редактировать** и `docs/` не удалять.
