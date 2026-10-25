# 04. AI: контекст страницы, режимы, мягкий отказ, токены

**Закрывает:** B2 (контекст страницы), B3 (уточнение вместо отказа, режимы), B4 (настройки машины словами), D3 (`MAX_TOKENS`).

Всё собрано в одной чистой функции `prepareChat` (`core/ai/prepareChat.ts`) — маршрут остаётся тонкой обвязкой.

## Что делает

1. **Контекст страницы.** Клиент шлёт `ctx=fabric/<slug>` (`ctxFromPath(pathname)`). Запись страницы идёт в контексте **первой**, поиск по тексту вопроса не вытесняется (общий лимит 6). Невалидный или несуществующий `ctx` просто игнорируется.
2. **Нет ссылок «из воздуха».** `X-Context-Slugs` строится из того же списка `context`, что и промт — страница, которой нет в контексте ответа, в заголовок не попадёт.
3. **Режимы** «Коротко / По шагам / Почему» — одна инструкция в промт плюс свой бюджет токенов.
4. **Бюджет токенов вместо 700:** коротко 400 · по шагам 1400 · почему 900 · обычный 1200.
5. **Мягкий отказ.** Правило `SOFT_REFUSAL_RULE` заменяет «В каталоге Швейки этого нет»: назвать, чего нет, и предложить ближайшее **из переданных данных** или задать один уточняющий вопрос. Если контекст пуст, в промт добавляется блок ближайших записей (`suggestNearest`) со slug.
6. **Обрыв.** `looksTruncated(text, finishReason)` ловит `length`/`max_tokens` и текст, оборванный на полуслове; к ответу дописывается `CONTINUE_NOTE`.
7. **Настройки словами.** `humanizeMachineSettings` → «Игла 80/12 (метрический №80, американский №12), прямой стежок, длина стежка 2–2,5 мм, натяжение верхней нити 3–5.» Кладётся в контекст рядом с сырым JSON.

> Замечание: в роадмапе «80/12» названа «японской». Это метрический №80 и американский №12 — в коде так и написано.

## Подключение в `api/chat/route.ts`

```ts
const catalog = await loadCatalog();
const prep = await prepareChat(
  { search: (q) => searchContext(q), nameOf: (ref) => nameOf(catalog, ref), pool: poolOf(catalog) },
  { question, ctx: body.ctx, mode: body.mode }
);

const system = `${buildSystemPrompt(prep.context /* как раньше */)}\n\n${prep.rules}`;
// max_tokens: prep.maxTokens            (вместо MAX_TOKENS)
// X-Context-Slugs: prep.context.map((e) => e.slug).join(',')
// по окончании стрима: if (looksTruncated(full, finishReason)) отдать CONTINUE_NOTE
```

`requestSchema.ts` расширить двумя необязательными полями: `ctx: z.string().max(100).optional()`, `mode: z.string().max(10).optional()` — значения всё равно проверяются `parsePageRef` и `isAnswerMode`.

Клиент (`ChatWidget`): `ctx: ctxFromPath(usePathname())`, переключатель режима → `mode`.

В место, где контекст превращается в текст промта, добавить:
`const human = humanizeMachineSettings(entry.machine_settings); if (human) text += '\n' + human;`

## Тесты

`ai.test.ts`: разбор `ctx` · слияние без дублей · фразы настроек · режимы · ближайшие записи · обрыв · `prepareChat` (приоритет страницы, неизвестная страница, пустой контекст).
