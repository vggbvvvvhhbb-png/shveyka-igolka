/**
 * Разговор бота с сайтом: каталог и помощник.
 *
 * Бот не ходит в базу и не знает про модели: всё, что он умеет показывать
 * из справочника и из помощника, спрашивается у сайта через тот же API, что
 * и страницы. Поэтому бот и сайт всегда показывают одно и то же.
 */

import { config } from "../config";
import { encodeUserName } from "@shveyka/core";

/** Сколько ждём ответ сайта. */
const REQUEST_TIMEOUT_MS = 60_000;

/** Запись каталога в ответе. */
export interface CatalogItem {
  slug: string;
  name: string;
  hint: string;
}

/** Ответ поиска по справочнику. */
export interface CatalogSearch {
  query: string;
  total: number;
  fabrics: CatalogItem[];
  seams: CatalogItem[];
  projects: CatalogItem[];
}

/** Сводка по справочнику. */
export interface CatalogOverview {
  fabrics: number;
  seams: number;
  projects: number;
}

/** Источник из интернета. */
export interface AssistantSource {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

/** Ответ помощника в режиме с интернетом. */
export interface AssistantAnswer {
  answer: string;
  mode: string;
  sources: AssistantSource[];
  steps: string[];
  model: string;
  degraded: string | null;
  followUps: string[];
  related: { label: string; href: string }[];
  conversationId: string | null;
}

/** Почему запрос не получился. */
export type ApiFailure = "limit" | "unavailable";

/** Результат запроса к сайту. */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; reason: ApiFailure };

/** Тело запроса к API: метод, заголовки и содержимое. */
interface ApiRequest {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

/** Выполняет запрос к API сайта и разбирает ответ. */
async function request<T>(
  path: string,
  init: ApiRequest,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${config.webApiUrl}${path}`, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.status === 429) return { ok: false, reason: "limit" };
    if (!res.ok) return { ok: false, reason: "unavailable" };

    const data = (await res.json()) as T;
    return { ok: true, value: data };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Ищет записи справочника по слову или фразе. */
export function searchCatalog(query: string): Promise<ApiResult<CatalogSearch>> {
  const path = `/api/catalog?q=${encodeURIComponent(query)}`;
  return request<CatalogSearch>(path, { method: "GET" }, 15_000);
}

/** Запрашивает сводку по справочнику. */
export function catalogOverview(): Promise<ApiResult<CatalogOverview>> {
  return request<CatalogOverview>("/api/catalog", { method: "GET" }, 15_000);
}

/** Ответ обычного режима «Каталог»: текст и id диалога. */
export interface ChatAnswer {
  text: string;
  conversationId: string | null;
}

/**
 * Кто спрашивает.
 *
 * Telegram знает идентификатор каждого человека: сайт записывает его в
 * отчёт о расходе токенов, и по нему видно, кто и сколько потратил.
 */
export interface BotUser {
  /** Идентификатор пользователя в Telegram. */
  id: number;
  /** Имя или ник: в отчёте видно, кто это. */
  name?: string;
}

/**
 * Заголовки, которыми бот говорит сайту, кто именно спрашивает.
 *
 * Имя кодируется: в Telegram оно часто на русском, а значение заголовка —
 * байтовая строка, и кириллица в ней ломает запрос целиком.
 */
function userHeaders(user: BotUser | null | undefined): Record<string, string> {
  if (!user || !Number.isFinite(user.id) || user.id === 0) return {};
  const headers: Record<string, string> = { "X-Shveyka-User": `tg:${user.id}` };
  const name = user.name?.trim();
  if (name) headers["X-Shveyka-User-Name"] = encodeUserName(name);
  return headers;
}

/**
 * Спрашивает помощника в режиме «Каталог».
 *
 * Ответ приходит потоком текста: для бота это неудобно, поэтому тело
 * собирается целиком.
 */
export async function askCatalog(
  message: string,
  conversationId: string | null,
  user?: BotUser | null
): Promise<ApiResult<ChatAnswer>> {
  try {
    const res = await fetch(`${config.webApiUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
        ...userHeaders(user),
      },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 429) return { ok: false, reason: "limit" };
    if (!res.ok) return { ok: false, reason: "unavailable" };

    const text = await res.text();
    if (text.trim().length === 0) return { ok: false, reason: "unavailable" };

    return {
      ok: true,
      value: { text, conversationId: res.headers.get("X-Conversation-Id") ?? conversationId },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Спрашивает помощника в режиме с интернетом: «Поиск», «Рассуждение» или
 * «Ресёрч».
 */
export function askWeb(
  message: string,
  mode: "search" | "reason" | "research",
  conversationId: string | null,
  user?: BotUser | null
): Promise<ApiResult<AssistantAnswer>> {
  return request<AssistantAnswer>(
    "/api/assistant",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
        ...userHeaders(user),
      },
      body: JSON.stringify({ message, mode }),
    },
    REQUEST_TIMEOUT_MS
  );
}

/** Текст для человека, когда запрос не получился. */
export function failureText(reason: ApiFailure): string {
  return reason === "limit"
    ? "Слишком много запросов за минуту. Подожди немного и попробуй ещё раз."
    : "Сайт сейчас недоступен, попробуй позже.";
}
