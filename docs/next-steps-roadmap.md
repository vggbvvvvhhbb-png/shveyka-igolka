# Shveyka — роадмап дальнейшей разработки

Документ подготовлен 19.10.2026 по состоянию репозитория `vggbvvvvhhbb-png/shveyka-igolka`.
Разделы 1–2 содержат готовый промт для кодинг-агента (клонировать как есть).

---

## Часть A. Что реально нужно кодить дальше

### Этап 0 — Разблокировка репозитория (блокер, делать первым)

Сейчас локальное рабочее дерево не собирается: **27 ошибок TypeScript**, `git pull` падает с
«untracked working tree files would be overwritten». Причина: локально лежит незакоммиченный
дубль той же фичи, которую 19.10 уже запушил `qwen.ai[bot]` (коммит `3e5015b`, PR #1, merge `819aab0`).

| Файл                                       | Что не так                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/api/chat/route.ts`       | В файл роута вклеен фрагмент из `ChatWidget` (строки 6–29: `FormEvent`, `send()`, `messages.filter`). `const allowedSlugs` объявлен дважды — импортом и локально. Нет импортов `buildRequestBody`, `parseSSEChunk`, `checkRateLimit`, `validateChatRequest`, `getDbSingleton`, `queries`, `buildSystemPrompt`, `streamFromKimi`, `GENERIC_ERROR`, `getClientIp` |
| `packages/core/src/ai/requestBody.ts`      | `import type { ChatProvider } from "../app/api/chat/route"` — путь не существует; core тянет тип из web-приложения (нарушение границы пакетов)                                                                                                                                                                                                                  |
| `packages/db/src/queries/searchContext.ts` | `findFabricsByAliases` используется без импорта                                                                                                                                                                                                                                                                                                                 |
| `apps/web/src/components/ChatWidget.tsx`   | Импорт несуществующего `allowedSlugs` из `@shveyka/core` (в `origin/main` называется `parseLinkSegments`)                                                                                                                                                                                                                                                       |

**Решение:** локальный дубль выбросить, забрать `origin/main`, из локального забрать **только**
одну вещь — production-фикс пула БД (см. Этап 1.1), он в `origin/main` не попал.

**Рекомендуемая последовательность:**

```bash
git stash -u                    # страховка: всё, включая untracked
git pull --ff-only origin main  # чистое дерево без конфликтов
git stash drop                  # после того, как убедились, что ценного не осталось
```

Ветка `origin/hello-from-qwen-68511` (`3e5015b`) — предок `origin/main`, отдельной ценности не несёт.

**Также в Этапе 0:**

- Удалить неотслеживаемый мусор: `packages/db/src/.clinerules` (артефакт чужого агента) и
  `packages/db/src/ai/parseLinks.test.ts` / `route.test.ts`, если решено перенести тесты (Этап 2).
- Убрать BOM (`﻿`) в начале `packages/core/src/index.ts` — в `origin/main` он есть.
- Дополнить `.env.example`: сейчас там только `DATABASE_URL`, `KIMI_API_KEY`, `NEXT_PUBLIC_APP_NAME`,
  а код читает ещё `AI_PROVIDER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ANTHROPIC_API_KEY`,
  `ANTHROPIC_MODEL`. Без них невозможно запустить AI-часть.
- Завести `AGENTS.md` в корне: `docs/README.md` требует, чтобы агент перед написанием UI-текстов
  проверял `docs/`, но самого `AGENTS.md` в репозитории нет.

---

### Этап 1 — Баги, которые бьют по продакшену (высокий приоритет)

#### 1.1 В production создаётся новый pg Pool на каждый вызов `getDbSingleton()` — главный баг

`packages/db/src/client.ts` в `origin/main`:

```ts
export function getDbSingleton(connectionString = process.env.DATABASE_URL ?? ""): DatabaseClient {
  if (process.env.NODE_ENV === "production") {
    return createDbClient(connectionString); // ← новый Pool на каждый запрос
  }
  // globalThis-кеш только для dev
}
```

Каждый server component render и каждый вызов `/api/chat` создаёт новый `Pool` на 5 соединений.
На serverless/Vercel это мгновенно упирается в лимит соединений Supabase и в «connection storm».
Комментарий в коде («In production, always returns a fresh instance») фиксирует это как намерение,
но как намерение оно ошибочно.

**Фикс (уже написан локально, но не закоммичен — перенести вручную):** убрать ветку `production`
и использовать `globalThis`-кеш во всех окружениях, с `__shveyka_pool__` как единственным источником
истины.

#### 1.2 `process.on("SIGTERM")` на каждый `createDbClient` — утечка слушателей

`packages/db/src/client.ts:29` — `process.on("SIGTERM", onSigterm)` регистрируется внутри
`createDbClient`. В связке с багом 1.1 в production это означает, что каждый HTTP-запрос добавляет
новый слушатель процесса → `MaxListenersExceededWarning` и утечка. Регистрацию SIGTERM нужно
вынести наружу (один раз на процесс) либо снимать в `pool.end()`.

#### 1.3 Поиск по каталогу не смотрит в алиасы и состав

`packages/db/src/queries/fabrics.ts`, `buildWhereConditions`: фильтр `q` — это
`ilike(fabrics.name, '%...%')`, **только по имени**. Поэтому:

- пользователь в `/fabrics` вводит «хлопок» → находит только ткани, у которых «хлопок» в `name`;
  ткани с хлопком в `composition` не находятся;
- алиасы (`aliases`) в веб-поиске не учитываются вообще, хотя `findFabricsByAliases` для этого и
  написан — и он уже используется в `searchContext` для AI;
- `composition` (состав: «100% хлопок», «полиэстер 95%») не ищется нигде.

Задача: единый поиск по `name` + `aliases` + `composition` + `care_instructions`/`common_issues`
(через `jsonb_array_elements_text`, как это уже сделано в `findFabricsByAliases`), с приоритетом
`name` и с сохранением текущей пагинации/сортировки.

#### 1.4 Противоречивый `@deprecated` на `findFabricsByAliases`

`packages/db/src/queries/fabrics.ts:129` помечает функцию как `@deprecated Use searchFabrics with q instead`,
но `packages/db/src/queries/searchContext.ts` (в `origin/main`) **обязательно** на неё опирается —
без неё поиск по алиасам в AI не работает. Пометить deprecated или переименовать в
`searchFabricsByQuery`, и привести в порядок соседние `getFabricById` / `listFabrics`, которые
помечены deprecated, но всё ещё экспортируются в `packages/db/src/queries/index.ts`.

#### 1.5 Мёртвая константа `MAX_CONTEXT_SLUGS_LENGTH`

`packages/core/src/ai/constants.ts` объявляет `MAX_CONTEXT_SLUGS_LENGTH = 2000`, но
`buildAllowedSlugsHeader` в `packages/core/src/ai/routeLogic.ts` использует собственный
дефолт `maxLength = 2000`. Константа не подключена — либо использовать её, либо удалить.

---

### Этап 2 — Тесты: перенести к тем, кого они тестируют

Сейчас вся логика `packages/core` (валидация, сборка тела запроса, парсинг SSE, rate limit,
разбор ссылок) тестируется файлами в `packages/db/src/ai/` — потому что в `packages/core`
нет vitest-конфига, а `package.json` core-пакета содержит `"test": "echo 'No tests in core'"`.
Тесты лежат в пакете, который их не содержит.

**Задача:**

1. Добавить `packages/core/vitest.config.mjs` (тот же конфиг, что у db: `globals: true`,
   `environment: "node"`) и скрипт `"test": "vitest run"` в `packages/core/package.json`.
2. Перенести `packages/db/src/ai/route.test.ts` → `packages/core/src/ai/routeLogic.test.ts`,
   `packages/db/src/ai/parseLinks.test.ts` → `packages/core/src/ai/parseLinks.test.ts`.
3. Добавить `vitest` в devDependencies `packages/core` (в pnpm-workspace.yaml уже есть
   `catalog: vitest: ^2.1.0`).
4. Убрать `"test": "echo 'No tests in web'"` из `apps/web/package.json` либо добавить туда
   vitest + jsdom и тесты на `ChatWidget` (рендер ссылок, стриминг, ошибка 429).
5. `packages/db` покрыть новыми тестами: `searchContext` (дедуп по slug, лимит 4 ткани, приоритет
   name над алиасами) и расширенный поиск по `composition`.

**Инварианты, которые тесты должны фиксировать (не дать откатиться):**

- `parseLinkSegments` оставляет ссылкой только slug из `allowedSlugs`, иначе возвращает голый текст;
  формат — `{ kind: "text", text }` / `{ kind: "link", text, href }`.
- `buildAllowedSlugsHeader` обрезает список до 2000 символов, формат — `тип/slug` через запятую.
- `checkRateLimit(ip, store, now)` — чистая функция, `store` передаётся снаружи, лимит 20 запросов
  за 60 секунд, детерминированное время через аргумент `now`.
- `parseSSEChunk` возвращает `null` для мусора, `data: [DONE]`, пустых строк и для
  не-Anthropic ответа без `choices[0].delta.content`; для Anthropic — только
  `type === "content_block_delta"`.
- `buildRequestBody` подставляет `max_tokens: 700` (MAX_TOKENS) и `model` из env для OpenRouter.
- `searchContext` дедуплицирует по `id` и не превышает 4 ткани / 8 швов / 8 проектов.

---

### Этап 3 — История диалога (нужна пользователю, упомянута в docs)

`docs/README.md` явно отсылает к блокам `conversations`, `messages`, `measurements` как к
будущим. Сейчас переписка живёт только в `useState` и **теряется при перезагрузке страницы**.

**Задача:**

1. Таблица `conversations` в `packages/db/src/schema.ts`:
   `id` (uuid/text PK), `title` (text, nullable — генерируется из первого сообщения),
   `created_at`, `updated_at`.
2. Таблица `messages`:
   `id`, `conversation_id` (FK → `conversations.id`, `onDelete: "cascade"`),
   `role` (text: `"user" | "assistant"`), `content` (text), `created_at`.
   Индексы: `conversations_idx` на `messages.conversation_id`, `messages_created_at_idx`.
3. Drizzle-миграция (`pnpm db:generate` + `pnpm db:push`), сид не трогать.
4. Query-слой в `packages/db/src/queries/conversations.ts`:
   `createConversation`, `getConversation`, `listConversations` (сортировка по `updated_at desc`),
   `addMessage`, `listMessages` (по `created_at asc`), `deleteConversation`.
   Экспортировать из `packages/db/src/queries/index.ts`.
5. Эндпоинт `apps/web/src/app/api/conversations/route.ts` (GET — список, POST — создать) и
   `apps/web/src/app/api/conversations/[id]/route.ts` (GET — сообщения, DELETE — удалить).
6. `ChatWidget` начинает работать с `conversationId`: при первой отправке создаёт диалог,
   после каждого ответа пишет пару сообщений в БД.
7. Экран `/assistant` показывает список диалогов сбоку (создание нового, переключение, удаление).
8. Тесты на pg-mem: CRUD диалогов, каскадное удаление сообщений, порядок сообщений.

**Ограничение по бюджету:** в MVP диалог живёт один пользователь, авторизации нет. Не вводить
таблицу пользователей — это отдельная задача.

---

### Этап 4 — Мерки и персональные рекомендации

Заявлены в `docs/README.md` (`alt-schema-api.md`), в текущей БД отсутствуют.

1. Таблица `measurements`: `id`, `name` ( bust/waist/hip/height — параметризовать), `value_cm`
   (integer), `updated_at`. Либо плоская таблица с колонками `bust`, `waist`, `hip`, `height` —
   выбрать одно и обосновать в комментарии схемы.
2. Эндпоинт `GET/PUT /api/measurements`.
3. Экран `/measurements` с формой ввода (значения в см, валидация Zod: 30–250 см).
4. Использование в `searchContext`: если у пользователя есть мерки, добавлять в контекст
   подходящие по размеру проекты (у `projects` уже есть `estimated_time_hours` и
   `fabric_amount_formula` — формулу расхода ткани нужно научить учитывать мерки).
5. В `systemPrompt.ts` добавить блок «Мерки пользователя», когда они есть.

**Осторожно:** это самый большой кусок работы и он меняет формат системного промпта. Делать
после Этапа 3, отдельным PR.

---

### Этап 5 — UX и контент (не требует БД, можно параллельно)

1. `apps/web/src/app/loading.tsx`, `error.tsx`, `not-found.tsx` — сейчас их нет ни на одной
   странице: при медленной БД пользователь видит белый экран, при ошибке — стандартную
   страницу Next.js на английском.
2. Скелетоны для карточек тканей/швов/проектов (уже есть стили Tailwind, stone-палитра).
3. `apps/web/src/app/fabrics/page.tsx`: сортировка и пагинация (сейчас отдаёт все 35 записей).
4. Поиск с подсветкой совпадений и пустые состояния (заглушка «Ничего не найдено» есть,
   уточнить текст).
5. `apps/web/src/app/assistant/page.tsx`: примеры вопросов-подсказок («Как шить джинсу?»,
   «Какую иглу для шёлка?») — они же показывают модель, что спрашивать.
6. `apps/web/src/app/fabrics/[slug]/page.tsx` и аналоги: кнопка «Спросить Швейку про это»
   с переходом на `/assistant` и предзаполненным вопросом.
7. Дождаться от пользователя файлов `docs/ux-copy.pdf`, `docs/ux-copy.html` — сейчас
   `docs/README.md` на них ссылается, а их нет. Все пользовательские строки брать оттуда.

---

### Этап 6 — Прод и надёжность

1. Деплой на Vercel (или другой хостинг) с `DATABASE_URL` из Supabase.
2. Rate limit: сейчас in-process `Map` в `packages/core/src/ai/routeLogic.ts` — при нескольких
   инстансах лимит не работает. Для прода вынести в Upstash Redis или оставить in-process,
   но тогда ограничить число инстансов.
3. Проверить, что `MAX_TOKENS = 700` достаточно для ответа с пошаговой инструкцией:
   обрезанный ответ обрывается на полуслове. Замерить на реальных вопросах.
4. Логирование ошибок провайдера (Sentry или хотя бы структурированный лог с `request id`).
5. Проверка `pnpm build` в CI: сейчас CI нет, а `packages/core` и `packages/db` отдают
   исходный TypeScript через `exports: { ".": "./src/index.ts" }` — при `transpilePackages`
   в `next.config.ts` это работает, но отдельный `tsc --noEmit` по всем пакетам в CI — нет.

---

## Часть B. Готовый промт для кодинг-агента

> Клонировать блок целиком. Значения в `<...>` — заполнить перед отправкой.

```text
Ты работаешь в репозитории Shveyka (https://github.com/vggbvvvvhhbb-png/shveyka-igolka) —
MVP-помощник по шитью на швейной машине Brother LS-200s: каталог тканей (35), швов (16),
проектов (6) плюс AI-консультант, отвечающий строго по данным каталога.

════════════════════════════════════════════════════════════════════
ЧАСТЬ 0. КОНТЕКСТ ПРОЕКТА — изучи перед правками
════════════════════════════════════════════════════════════════════

Стек:
  pnpm workspaces (pnpm 9.12.0) + Turborepo 2.3
  apps/web     — Next.js 15 (App Router), React 19, Tailwind 4, TypeScript 5.5
  packages/core — типы, Zod-схемы, чистая логика AI (без React, без БД)
  packages/db  — Drizzle ORM 0.36 + pg 8.13 + Supabase Postgres, тесты на pg-mem + vitest 2.1
  zod 3.25, typescript 5.5, vitest 2.1 — версии фиксированы через pnpm catalog

Раскладка:
  apps/web/src/app/            — page.tsx (главная), layout.tsx, globals.css,
                                 fabrics/ fabrics/[slug]/, seams/ seams/[slug]/,
                                 projects/ projects/[slug]/, assistant/,
                                 api/chat/route.ts
  apps/web/src/components/     — Header, Footer, FabricCard, FabricFilters, SeamCard,
                                 ProjectCard, ChatWidget
  apps/web/src/lib/            — fabricsPageData.ts (server-side fetcher на React cache())
  packages/core/src/schemas/   — knowledge.ts (Zod-схемы домена)
  packages/core/src/validators/ — knowledge.ts
  packages/core/src/ai/        — contextSchema.ts, requestSchema.ts, systemPrompt.ts,
                                 constants.ts, parseLinks.ts, routeLogic.ts
  packages/db/src/             — schema.ts (Drizzle), client.ts (pg Pool), seed.ts,
                                 queries/{fabrics,seams,projects,searchContext}.ts,
                                 utils/withRetry.ts
  packages/db/data/            — fabrics.json, seams.json, projects.json (сиды)
  docs/                        — README.md с правилами и ссылками на ещё не выложенные
                                 ux-copy.pdf / ux-copy.html / alt-architecture.md / alt-schema-api.md
  knowledge.txt                — эталонные TS-типы домена (Fabric/Seam/Project/MachineSettings)

Текущее состояние git:
  main = a6c1204 (локально), origin/main = 819aab0 (2 коммита впереди).
  19.10.2026 в 17:27 МСК прилетел коммит 3e5015b от qwen.ai[bot] через PR #1
  (ветка origin/hello-from-qwen-68511), смержен в 17:37.
  Содержимое: фильтрация ссылок по заголовку X-Context-Slugs, MAX_TOKENS=700,
  вынесение логики роута в packages/core/src/ai/routeLogic.ts, русская ошибка Zod
  для роли, поиск по алиасам в searchContext, pg pool max 10→5, офлайн-тесты.

════════════════════════════════════════════════════════════════════
ЧАСТЬ 1. ЖЁСТКИЕ ПРАВИЛА
════════════════════════════════════════════════════════════════════

1. НИКОГДА не редактируй `packages/db/data/*.json` вручную для правок данных — они
   являются сидами; правки данных делаются через seed + `pnpm seed:fresh`.
2. `packages/core` НЕ ИМЕЕТ ПРАВА импортировать из `apps/*` и из `packages/db`.
   Обратное (db → core) разрешено и уже используется.
3. `packages/db` не должен содержать тесты кода из `packages/core`.
4. Любая чистая логика, которую можно покрыть тестом без сети и без БД, — выносится
   в `packages/core`, а не пишется inline в роуте или компоненте.
5. Все пользовательские строки — на русском. Тон: спокойный, без снисходительности.
   Ошибки пользователю — обобщённые, без стектрейсов и внутренних деталей.
6. Никаких `any` (eslint `@typescript-eslint/no-explicit-any` = warn, но в коде — ноль).
7. Каждое обращение к БД оборачивается в `withRetry` из `packages/db/src/utils/withRetry.ts`.
8. Комментарии и doc-блоки — на русском, в стиле существующих (см. schema.ts, routeLogic.ts).
9. Коммиты — conventional commits, как в существующей истории:
   feat(web,core,db): … / fix(db): … / chore: …
   Один коммит = одна логическая задача.
10. Не трогай `docs/README.md` и не удаляй `docs/` — там референсные материалы.
11. Не добавляй зависимости без явной необходимости. Если нужна новая —
    сначала проверь pnpm-workspace.yaml catalog, потом обнови lockfile.
12. Никаких заглушек вида `// TODO: реализовать` в коде. Если задача не входит в
    текущий PR — не начинать её.

════════════════════════════════════════════════════════════════════
ЧАСТЬ 2. ЗАДАЧА — выполнить последовательно, каждый пункт отдельным коммитом
════════════════════════════════════════════════════════════════════

── ЭТАП 0. Привести репозиторий в рабочее состояние ──────────────

0.1. Локальное рабочее дерево содержит сломанный незакоммиченный дубль фичи Qwen
     (27 ошибок TS). Он НЕ нужен. Сделай так:
       git stash -u
       git pull --ff-only origin main
       git stash drop
     Если `git stash -u` невозможен (файлы уже удалены) — сначала покажи
     `git status` и `git diff` и спроси.

0.2. ПЕРЕНЕСИ из удалённого локального изменения одну правку, которой нет в
     origin/main: в `packages/db/src/client.ts` функция `getDbSingleton` в
     production создаёт НОВЫЙ pg Pool на каждый вызов:

       if (process.env.NODE_ENV === "production") {
         return createDbClient(connectionString);   // ← баг
       }

     Исправь: единый globalThis-кеш `__shveyka_pool__` для ВСЕХ окружений,
     production-ветку удали, комментарий «In production, always returns a fresh
     instance» перепиши. Добавь короткий комментарий, почему кеш нужен в
     production (serverless: иначе новый Pool на каждый запрос → исчерпание
     соединений Supabase).

0.3. В `packages/db/src/client.ts` обработчик `process.on("SIGTERM", onSigterm)`
     регистрируется внутри `createDbClient` → на каждый вызов добавляется новый
     слушатель процесса. Вынеси регистрацию так, чтобы она выполнялась один раз
     на процесс, и снимай слушатель при `pool.end()`.

0.4. Удали BOM (символ U+FEFF) в начале `packages/core/src/index.ts`.

0.5. Дополни `/.env.example` всеми переменными, которые реально читает код:
       DATABASE_URL, AI_PROVIDER, KIMI_API_KEY, ANTHROPIC_API_KEY, ANTHROPIC_MODEL,
       OPENROUTER_API_KEY, OPENROUTER_MODEL, NEXT_PUBLIC_APP_NAME
     С значениями-примерами и комментарием, что AI_PROVIDER ∈ {kimi, anthropic, openrouter}.
     Проверь фактические чтения через grep по process.env во всём репозитории,
     чтобы ничего не пропустить.

0.6. Удали неотслеживаемый мусор `packages/db/src/.clinerules` (артефакт чужого
     агента) и зафиксируй `.clinerules` в .gitignore, если такие файлы появятся снова.

0.7. Создай в корне `AGENTS.md`: назначение проекта, стек, структура, команды
     (pnpm dev / build / lint / test / db:push / seed / seed:fresh), правила
     из Части 1, и правило «перед написанием UI-текстов проверить docs/».
     Формат — для агента, коротко и по делу.

── ЭТАП 1. Поиск по каталогу ──────────────────────────────────────

1.1. Сейчас фильтр `q` в `packages/db/src/queries/fabrics.ts` (buildWhereConditions)
     — это `ilike(fabrics.name, '%q%')`, только имя. Расширь поиск так, чтобы
     он находил ткань по:
       • name            (приоритет 1)
       • aliases         (приоритет 2)
       • composition     (приоритет 3)
       • common_issues / care_instructions (приоритет 4)
     Реализацию по jsonb-массивам уже показывает `findFabricsByAliases` в этом же
     файле (паттерн `jsonb_array_elements_text` + EXISTS) — переиспользуй подход.
     Сохрани текущую семантику остальных фильтров (category/weight/stretch) и
     сигнатуры `searchFabrics(db, filters)` / `countFabrics(db, filters)`.

1.2. Сними противоречивый `@deprecated` с `findFabricsByAliases`: она реально
     используется в `packages/db/src/queries/searchContext.ts` для поиска по
     алиасам в AI-контексте. Переименуй в `searchFabricsByQuery` (обнови все
     места вызова и экспорт в `packages/db/src/queries/index.ts`) и обнови
     doc-комментарий.

1.3. Убедись, что веб-поиск на /fabrics (packages/db/src/queries/fabrics.ts через
     apps/web/src/lib/fabricsPageData.ts) и поиск в AI (searchContext.ts) используют
     одну и ту же функцию поиска, чтобы поведение не расходилось. Приведи
     searchContext.ts к новому имени функции из п.1.2.

── ЭТАП 2. Тесты ──────────────────────────────────────────────────

2.1. Добавь `packages/core/vitest.config.mjs` (конфиг как у db: globals:true,
     environment:"node") и скрипт "test": "vitest run" в packages/core/package.json,
     плюс vitest в devDependencies (версия из catalog).
2.2. Перенеси `packages/db/src/ai/route.test.ts` → `packages/core/src/ai/routeLogic.test.ts`
     и `packages/db/src/ai/parseLinks.test.ts` → `packages/core/src/ai/parseLinks.test.ts`.
     Импорты поправь. Удали пустую папку packages/db/src/ai.
2.3. `apps/web/package.json`: "test": "echo 'No tests in web'" — замени на реальный
     vitest. Добавь vitest, @testing-library/react, @testing-library/jest-dom, jsdom
     и vitest.config.mjs с environment:"jsdom" + setup-файлом.
2.4. Напиши тесты на ChatWidget: рендер текста, кликабельная ссылка только для
     slug из заголовка X-Context-Slugs, неизвестный slug → обычный текст,
     отображение ошибки 429/500, счётчик символов, автоотправка по Enter.
     Для тестов понадобится мок fetch — сделай через vi.stubGlobal.
2.5. Расширь тесты packages/db: searchContext (дедуп по slug, максимум 4 ткани,
     приоритет name над алиасами, alias-only находка) и новый расширенный поиск
     (name/aliases/composition). Используй pg-mem так же, как в существующих
     тестах packages/db/src/queries/*.test.ts.

── ЭТАП 3. История диалога ────────────────────────────────────────

3.1. Таблица `conversations` в packages/db/src/schema.ts:
      id text PK, title text (nullable — генерируется из первого сообщения),
      created_at timestamptz defaultNow notNull, updated_at timestamptz defaultNow notNull
    Таблица `messages`:
      id text PK, conversation_id text notNull → FK conversations.id onDelete cascade,
      role text notNull, content text notNull, created_at timestamptz defaultNow notNull
    Индексы: messages_conversation_id_idx, messages_created_at_idx.
    Стиль — как в существующих таблицах (pgTable, jsonb, timestamp withTimezone,
    $onUpdate(() => new Date())).
3.2. Сгенерируй миграцию: `pnpm db:generate` и `pnpm db:push`.
3.3. packages/db/src/queries/conversations.ts: createConversation, getConversation,
     listConversations (updated_at desc), addMessage, listMessages (created_at asc),
     deleteConversation. Каждый запрос — через withRetry. Экспортируй из
     packages/db/src/queries/index.ts.
3.4. apps/web/src/app/api/conversations/route.ts — GET (список), POST (создать).
     apps/web/src/app/api/conversations/[id]/route.ts — GET (сообщения), DELETE.
     Обработка ошибок — в стиле apps/web/src/app/api/chat/route.ts.
3.5. ChatWidget: при первой отправке создать диалог, после каждого ответа писать
     пару сообщений в БД. Состояние conversationId — в useState + localStorage,
     чтобы перезагрузка страницы не теряла диалог.
3.6. Экран /assistant: список диалогов сбоку, кнопки «новый диалог», «удалить»,
     переключение. Состояние загрузки и пустые состояния — на русском.
3.7. Тесты на pg-mem: CRUD, каскадное удаление сообщений при удалении диалога,
     порядок сообщений по created_at.

── ЭТАП 4. Мерки ──────────────────────────────────────────────────

4.1. Таблица `measurements` в schema.ts: id, bust integer, waist integer,
     hip integer, height integer, updated_at. Валидация Zod в packages/core:
     каждое значение — от 30 до 250 см, все поля опциональны.
4.2. Query-слой + эндпоинты GET/PUT /api/measurements.
4.3. Экран /measurements: форма ввода в см, валидация на клиенте и сервере,
     сохранение, состояние загрузки.
4.4. В searchContext: если мерки есть, добавлять в ассистентский контекст блок
     с мерками. В systemPrompt.ts добавить инструкцию использовать мерки при
     подборе проекта и расчёте расхода ткани.
4.5. Тесты: валидация границ, сохранение и чтение, влияние на контекст.

── ЭТАП 5. UX ─────────────────────────────────────────────────────

5.1. Добавить loading.tsx, error.tsx (с client-компонентом и кнопкой «Повторить»)
     и not-found.tsx для разделов fabrics, seams, projects, assistant.
     Тексты — на русском, в tone проекта.
5.2. Скелетоны карточек для каталогов.
5.3. Пагинация и сортировка на /fabrics (сейчас отдаёт все записи сразу).
     Требование: параметры пагинации — в searchParams, чтобы работало
     кнопки «назад»/«вперёд» в браузере и не ломало SSR.
5.4. На /assistant — 4–6 примеров вопросов-подсказок, кликабельных.
5.5. На страницах ткани/шва/проекта — кнопка «Спросить Швейку про это»,
     ведущая на /assistant с предзаполненным вопросом.
5.6. Внимание: docs/README.md ссылается на ux-copy.pdf / ux-copy.html, которых
     в репозитории нет. Если их нет — напиши об этом в отчёте и собери тексты
     сам, в едином tone, перечислив их в отчёте для последующего ревью.

── ЭТАП 6. Прод ───────────────────────────────────────────────────

6.1. Скрипт `typecheck` в корневом package.json:
     tsc --noEmit по tsconfig каждого пакета. Добавить в turbo.json задачу
     typecheck и прогонять его перед build.
6.2. Логирование: единый формат ошибок с полем requestId, чтобы можно было
     связать ошибку клиента с логом провайдера. Без стектрейсов в ответе клиенту.
6.3. Проверь и зафиксируй лимиты: MAX_TOKENS=700 — замерь на реальных вопросах
     (шаги шитья), не обрывается ли ответ. Если обрывается — предложи значение
     и обоснуй, но не меняй молча.

════════════════════════════════════════════════════════════════════
ЧАСТЬ 3. КРИТЕРИИ ПРИЁМКИ
════════════════════════════════════════════════════════════════════

Обязательно перед финальным отчётом:
  □ pnpm install --frozen-lockfile проходит
  □ pnpm build проходит без ошибок и предупреждений Next.js
  □ pnpm lint проходит (0 errors)
  □ pnpm test — ВСЕ тесты зелёные, включая перенесённые и новые
  □ pnpm typecheck (новый скрипт) — 0 ошибок
  □ npx tsc --noEmit по каждому пакету — 0 ошибок
  □ git status чистый, все изменения закоммичены осмысленными коммитами
  □ каждое изменение покрыто тестом там, где это возможно без БД и сети
  □ новые переменные окружения добавлены в .env.example
  □ в отчёте перечислены: что сделано, какие решения приняты и почему,
    что осталось незакрытым, какие допущения требуют подтверждения владельцем

Правила оформления коммитов:
  feat(scope): краткое описание в повелительном наклонении
  Один коммит — одна задача из Части 2. Не смешивай этапы в один коммит.

════════════════════════════════════════════════════════════════════
ЧАСТЬ 4. ПЕРЕМЕННЫЕ, КОТОРЫЕ НУЖНО ЗАПОЛНИТЬ
════════════════════════════════════════════════════════════════════

  <СУПЕРВАЙЗЕР_МОДЕЛЬ>       — модель для супервизора (если используется)
  <ПРОВЕЙДЕР_И_API_КЛЮЧ>     — kimi / anthropic / openrouter и ключ для прогона AI-тестов
  <ЦЕЛЕВОЙ_ХОСТИНГ>          — где будет прод (vercel / другой)
  <ПРИОРИТЕТ_ЭТАПОВ>          — оставить порядок 0→6 или указать другой
  <ДОПУСТИМО_ЛИ_ДОБАВЛЯТЬ_ЗАВИСИМОСТИ> — yes/no

Если что-то в постановке противоречит существующему коду — сначала сообщи о
противоречии и предложи вариант, а не переписывай молча.
```

---

## Часть C. Приоритеты одной строкой

| Приоритет  | Задача                                                             | Почему                                        |
| ---------- | ------------------------------------------------------------------ | --------------------------------------------- |
| 🔴 Блокер  | Этап 0 — сбросить сломанный локальный дубль, забрать `origin/main` | Репозиторий не собирается, `git pull` падает  |
| 🔴 Блокер  | 1.1 + 1.2 — production-пул и SIGTERM                               | Упирается в лимит соединений Supabase в проде |
| 🟠 Высокий | 1.3 — поиск по алиасам и составу                                   | Пользователь не находит ткань по «хлопку»     |
| 🟠 Высокий | Этап 2 — перенести тесты в `packages/core`, покрыть web            | Регрессии в AI-логике ловятся только вручную  |
| 🟡 Средний | Этап 3 — история диалога                                           | Фича, заявленная в `docs/README.md`           |
| 🟡 Средний | Этап 5 — loading/error/not-found, пагинация                        | Сейчас белый экран на медленной БД            |
| 🟢 Низкий  | Этап 4 — мерки                                                     | Самый большой объём, меняет формат промпта    |
| 🟢 Низкий  | Этап 6 — прод, rate limit, логирование                             | Нужно после стабилизации Этапа 3              |
