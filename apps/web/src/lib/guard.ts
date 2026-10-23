import { checkRateLimit, type RateStore } from "@shveyka/core";

/**
 * Лимит запросов для маршрута: 20 за минуту с одного IP (как в /api/chat).
 * Хранится в памяти процесса, поэтому на нескольких инстансах слабее.
 * Возвращает функцию: true — запрос можно обрабатывать.
 */
export function createGuard(): (req: Request) => boolean {
  const store: RateStore = new Map();
  return (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    return checkRateLimit(ip, store);
  };
}
