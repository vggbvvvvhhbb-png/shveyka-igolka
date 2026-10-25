import { checkLimit } from "@shveyka/core";
import { errorResponse } from "./apiResponse";
import { getRateStore } from "./upstashStore";

/** Лимит помощника: 20 запросов за минуту с одного адреса. */
export const RATE_LIMIT = 20;
export const RATE_WINDOW_SEC = 60;

/**
 * Адрес клиента.
 *
 * Заголовок ставит обратный прокси (Caddy). Без доверенного прокси его можно
 * подделать — тогда лимит обходится. Это осознанный компромисс.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export interface LimitOptions {
  /** Ключ счётчика: обычно «назначение:адрес». */
  key: string;
  limit?: number;
  windowSec?: number;
  requestId: string;
  message?: string;
}

/**
 * Проверка лимита для маршрута.
 *
 * Возвращает готовый ответ 429, если запрос не проходит, и null — когда можно
 * обрабатывать дальше. Сбой счётчика запрос не блокирует.
 */
export async function limitRequest(req: Request, options: LimitOptions): Promise<Response | null> {
  const { allowed } = await checkLimit(
    getRateStore(),
    options.key,
    options.limit ?? RATE_LIMIT,
    options.windowSec ?? RATE_WINDOW_SEC,
    (e) =>
      console.error("[ratelimit] rate store is unavailable", {
        name: e instanceof Error ? e.name : "unknown",
      })
  );

  if (allowed) return null;

  return errorResponse(
    options.message ?? "Слишком много запросов, подождите минуту",
    429,
    options.requestId
  );
}
