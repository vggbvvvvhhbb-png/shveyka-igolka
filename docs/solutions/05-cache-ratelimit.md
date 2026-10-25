# 05. Кэш ответов и общий rate limit

**Закрывает:** B11 (кэш), D4 (лимит живёт в памяти процесса).

## Кэш ответов (`core/ai/answerCache.ts`)

Ключ = режим + хэш(нормализованный вопрос, отсортированные slug контекста, **версия каталога**). Версия — максимум `updated_at` по каталогу: правка записи инвалидирует всё без ручной очистки.

- «Какая ИГЛА для Джинсы?!» и «какая игла для джинсы» — один ключ.
- **Не кэшируется**, если есть история диалога или в контекст попали мерки (`isCacheable`): такой ответ личный.
- Не кэшируется оборванный ответ (`looksTruncated`).
- `TtlLruCache`: 500 записей, TTL 24 ч, вытеснение LRU.
- `textToStream(text, frame)` отдаёт готовый ответ потоком; `frame` оборачивает кусок в формат клиента (например, SSE: ``c => `data: ${c}\n\n` ``).

```ts
const answers = ((globalThis as any).__answers ??=
  new TtlLruCache<string>()) as TtlLruCache<string>;
const key = cacheKey({
  question,
  slugs: prep.context.map((e) => e.slug),
  mode: prep.mode,
  catalogVersion: catalog.version,
});
const ok = isCacheable({ hasHistory: history.length > 0, usesMeasurements });
const hit = ok ? answers.get(key) : undefined;
if (hit) return new Response(textToStream(hit /*, frame под ваш формат */), { headers });
// …после завершения стрима: if (ok && !looksTruncated(full, reason)) answers.set(key, full);
```

## Общий rate limit (`core/ai/rateLimitStore.ts`, `web/lib/upstashStore.ts`)

- Интерфейс `RateStore.hit(key, windowSec)`; реализации: `MemoryRateStore` и `UpstashRateStore` (REST, `INCR` + `EXPIRE` одним запросом, без зависимостей).
- `getRateStore()` выбирает Upstash, если заданы `UPSTASH_REDIS_REST_URL/TOKEN`, иначе память. Хранилище живёт в `globalThis`.
- **Fail-open:** при недоступном Redis `checkLimit` пропускает запрос и пишет в лог — сбой счётчика не должен класть чат.

```ts
const { allowed } = await checkLimit(getRateStore(), ip, 20, 60, (e) =>
  console.error("[ratelimit]", e)
);
if (!allowed) return /* прежний ответ 429 с requestId */;
```

То же в `lib/guard.ts` для новых маршрутов.

## Тесты

Нормализация · стабильность ключа и смена при новой версии/режиме · версия каталога · `isCacheable` · TTL/LRU · поток · окно и сброс лимита · fail-open.

## Как применено

Признак «ответ личный» считается по собранному контексту: мерки попадают в
ответ только владельцу (см. 08), поэтому чужие ответы остаются кэшируемыми, а
ответ владельца с мерками — нет.

Оборванный ответ не сохраняется: `looksTruncated` проверяется до записи в
кэш, иначе следующий посетитель получил бы обрывок.

Лимит запросов чата считает `lib/guard.ts` через `getRateStore()`. Хранилище
живёт в `globalThis`, поэтому не сбрасывается при горячей перезагрузке.
