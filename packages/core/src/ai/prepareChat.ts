import { mergeContext, parsePageRef, type PageRef } from "./pageContext";
import { isAnswerMode, maxTokensFor, modeInstruction, type AnswerMode } from "./modes";
import { buildFallbackBlock, suggestNearest, type PoolEntry } from "./fallback";
import type { ContextEntry } from "./contextEntries";

/**
 * Сколько записей каталога уходит в контекст ответа.
 *
 * Запись текущей страницы занимает один слот, остальное — поиск по вопросу.
 */
export const CONTEXT_LIMIT = 6;

export interface ChatDeps {
  /** Поиск по каталогу по тексту вопроса. */
  search: (question: string) => Promise<ContextEntry[]>;
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
  // Несуществующая или чужая страница просто игнорируется.
  const pinned = ref ? await deps.entry(ref) : null;

  const context = mergeContext(pinned, found, CONTEXT_LIMIT);
  const block =
    context.length === 0 ? buildFallbackBlock(suggestNearest(input.question, deps.pool)) : "";

  return {
    context,
    pinned,
    mode,
    maxTokens: maxTokensFor(mode),
    rules: [modeInstruction(mode), block].filter(Boolean).join("\n\n"),
  };
}
