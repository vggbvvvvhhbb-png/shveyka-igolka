import { mergeContext, parsePageRef, type PageRef } from "./pageContext";
import { isAnswerMode, maxTokensFor, modeInstruction, type AnswerMode } from "./modes";
import { buildFallbackBlock, suggestNearest, type PoolEntry } from "./fallback";
import { flattenContext, measurementsOf, type ContextEntry } from "./contextEntries";
import type { AssistantContext } from "./contextSchema";
import type { BodyMeasurements } from "./measurements";

/**
 * Сколько записей каталога уходит в контекст ответа.
 *
 * Запись текущей страницы занимает один слот, остальное — поиск по вопросу.
 */
export const CONTEXT_LIMIT = 6;

export interface ChatDeps {
  /**
   * Поиск по каталогу по тексту вопроса.
   *
   * Возвращается сгруппированный контекст целиком, а не плоский список
   * записей: кроме каталога в нём могут быть мерки владельца. Мерки — не
   * запись каталога, в плоском списке им нет, и потерянные мерки означают
   * ответ без размеров пользователя.
   */
  search: (question: string) => Promise<AssistantContext>;
  /** Запись текущей страницы; null — такой страницы нет. */
  entry: (ref: PageRef) => Promise<ContextEntry | null>;
  /** Весь каталог в плоском виде — для мягкого отказа. */
  pool: readonly PoolEntry[];
}

export interface PreparedChat {
  /** Контекст ответа: из него же строится блок данных и список ссылок. */
  context: ContextEntry[];
  /** Запись текущей страницы, если она есть в каталоге. */
  pinned: ContextEntry | null;
  /** Мерки владельца, если они есть; иначе null/undefined. */
  measurements: BodyMeasurements | undefined;
  mode: AnswerMode | null;
  /** Бюджет токенов под выбранный режим. */
  maxTokens: number;
  /** Текст, который дописывается в конец системного промта. */
  rules: string;
}

/**
 * Единая точка сборки контекста чата: страница → поиск → режим → подсказка отказа.
 *
 * `context` — единственный источник и для промта, и для X-Context-Slugs,
 * поэтому ссылка на страницу вне контекста невозможна.
 */
export async function prepareChat(
  deps: ChatDeps,
  input: { question: string; ctx?: unknown; mode?: unknown }
): Promise<PreparedChat> {
  const mode = isAnswerMode(input.mode) ? input.mode : null;
  const ref = parsePageRef(input.ctx);

  const found = await deps.search(input.question);
  // Мерки идут отдельным полем: в плоском списке записей каталога их нет.
  const measurements = measurementsOf(found);
  // Несуществующая или чужая страница просто игнорируется.
  const pinned = ref ? await deps.entry(ref) : null;

  const context = mergeContext(pinned, flattenContext(found), CONTEXT_LIMIT);
  const block =
    context.length === 0 ? buildFallbackBlock(suggestNearest(input.question, deps.pool)) : "";

  return {
    context,
    pinned,
    measurements,
    mode,
    maxTokens: maxTokensFor(mode),
    rules: [modeInstruction(mode), block].filter(Boolean).join("\n\n"),
  };
}
