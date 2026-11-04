import { randomUUID } from "node:crypto";
import type { UsageSource } from "@shveyka/core";
import { queries, type DatabaseClient } from "@shveyka/db";

/**
 * Кто спрашивает помощника.
 *
 * На сайте человек анонимный: у него нет аккаунта, и заводить его ради
 * отчёта не нужно. Поэтому сайт запоминает случайный идентификатор в
 * cookie — по нему видно, что один и тот же человек приходил снова, но
 * личных данных там нет.
 *
 * Telegram-бот знает, кто написал: у Telegram есть числовой идентификатор
 * пользователя. Бот передаёт его заголовком, и в отчёте видно, кто и сколько
 * потратил.
 */

/** Cookie с анонимным идентификатором посетителя сайта. */
export const USER_COOKIE = "shveyka_uid";

/** Заголовок, которым бот передаёт идентификатор пользователя Telegram. */
export const BOT_USER_HEADER = "x-shveyka-user";

/** Заголовок, которым бот передаёт имя пользователя Telegram. */
export const BOT_USER_NAME_HEADER = "x-shveyka-user-name";

/** Кто перед нами и откуда пришёл вопрос. */
export interface UsageUser {
  /** Ключ пользователя в отчёте: `web:<id>` или `tg:<id>`. */
  userKey: string;
  /** Имя или ник, если известен. */
  userLabel: string | null;
  /** Сайт или бот. */
  source: UsageSource;
  /** Cookie, которую надо поставить в ответ, если её ещё нет. */
  setCookie: string | null;
}

/** Читает cookie из заголовка запроса. */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Находит пользователя по запросу и готовит cookie для ответа. */
export function resolveUsageUser(req: Request): UsageUser {
  // Бот передаёт идентификатор Telegram: он точнее анонимной cookie.
  const botUser = req.headers.get(BOT_USER_HEADER)?.trim();
  if (botUser) {
    const label = req.headers.get(BOT_USER_NAME_HEADER)?.trim();
    return {
      userKey: botUser,
      userLabel: label && label.length > 0 ? label : null,
      source: "bot",
      setCookie: null,
    };
  }

  const existing = readCookie(req, USER_COOKIE);
  if (existing && /^[a-z0-9-]{8,64}$/i.test(existing)) {
    return {
      userKey: `web:${existing}`,
      userLabel: null,
      source: "web",
      setCookie: null,
    };
  }

  const id = randomUUID();
  return {
    userKey: `web:${id}`,
    userLabel: null,
    source: "web",
    setCookie: `${USER_COOKIE}=${id}; Path=/; Max-Age=31536000; SameSite=Lax`,
  };
}

/**
 * Записывает расход токенов.
 *
 * Ошибка записи не должна ломать ответ: человек уже получил его, а отчёт
 * можно попросить позже. Поэтому здесь ошибка гасится, а в лог уходит
 * только её имя — без внутренних деталей.
 */
export async function recordUsageSafe(
  db: DatabaseClient,
  input: queries.UsageInput
): Promise<void> {
  try {
    await queries.recordUsage(db, input);
  } catch (err) {
    console.error("[usage] расход не записан", {
      name: err instanceof Error ? err.name : "unknown",
    });
  }
}
