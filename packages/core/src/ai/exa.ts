/**
 * Поиск в интернете через Exa.
 *
 * Используется режимами «Поиск», «Рассуждение» и «Ресёрч»: сначала находятся
 * страницы, потом модель отвечает по ним вместе с данными каталога.
 */

import { isSafeSourceUrl, type Source } from "./source";

/** Режим поиска Exa. */
export type ExaSearchType = "auto" | "lite" | "deep";

/** Ошибка поиска: нет ключа, сеть или ответ без результатов. */
export class ExaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExaError";
  }
}

/** Параметры одного поискового запроса. */
export type ExaSearchOptions = {
  /**
   * Сколько результатов нужно.
   *
   * Это осознанное решение: для ответа хватает handful страниц, а лишние
   * результаты только раздувают контекст модели.
   */
  numResults?: number;
  /** Режим поиска. По умолчанию `auto` — лучший баланс качества и скорости. */
  type?: ExaSearchType;
  /** Таймаут запроса в миллисекундах. */
  timeoutMs?: number;
};

const DEFAULT_BASE_URL = "https://api.exa.ai";
const DEFAULT_TIMEOUT_MS = 20_000;
const SNIPPET_LIMIT = 320;

type ExaResult = {
  id?: string;
  title?: string | null;
  url?: string | null;
  author?: string | null;
  highlights?: string[];
  text?: string;
  publishedDate?: string | null;
};

type ExaResponse = {
  results?: ExaResult[];
  error?: { message?: string };
};

/**
 * Приводит адрес к сравнимому виду: без протокола, без «www.», без
 * завершающего слэша и без параметров.
 *
 * Так два адреса одной страницы не попадут в список дважды.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Убирает повторы и обрезает список до нужного размера.
 *
 * Первый источник по каждому адресу сохраняется: порядок выдачи Exa — это
 * порядок релевантности, и терять его не стоит.
 */
export function dedupeSources(sources: Source[], limit: number): Source[] {
  const seen = new Set<string>();
  const result: Source[] = [];

  for (const source of sources) {
    if (!isSafeSourceUrl(source.url)) continue;
    const key = normalizeUrl(source.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(source);
    if (result.length >= limit) break;
  }

  return result;
}

/** Короткая выдержка из страницы: первый highlight, обрезанный по длине. */
function buildSnippet(result: ExaResult): string {
  const highlight = result.highlights?.find((item) => item.trim().length > 0);
  const text = (highlight ?? result.text ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= SNIPPET_LIMIT) return text;
  return `${text.slice(0, SNIPPET_LIMIT).trimEnd()}…`;
}

/**
 * Ищет страницы в интернете.
 *
 * Бросает ExaError, если ключ не настроен или провайдер ответил ошибкой.
 * Пустой результат — не ошибка: просто нечего показать.
 */
export async function exaSearch(query: string, options: ExaSearchOptions = {}): Promise<Source[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new ExaError("Ключ поиска не настроен");
  }

  const baseUrl = (process.env.EXA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: options.type ?? "auto",
        numResults: options.numResults ?? 5,
        contents: { highlights: true },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[exa] search responded with an error", {
        status: response.status,
        detail: detail.slice(0, 300),
      });
      throw new ExaError(`Поиск ответил ошибкой ${response.status}`);
    }

    const payload = (await response.json()) as ExaResponse;
    const results = payload.results ?? [];

    return results
      .filter((item): item is ExaResult & { url: string } => typeof item.url === "string")
      .map((item) => ({
        title: item.title?.trim() || item.url,
        url: item.url,
        snippet: buildSnippet(item),
        ...(item.publishedDate ? { date: item.publishedDate } : {}),
      }));
  } catch (err) {
    if (err instanceof ExaError) throw err;
    throw new ExaError("Поиск недоступен");
  } finally {
    clearTimeout(timer);
  }
}
