import { isOwner } from "@shveyka/core";

/**
 * Запрос от владельца?
 *
 * Без OWNER_KEY — всегда да: сайт ведёт себя как раньше, личные страницы
 * открыты всем.
 */
export const requestIsOwner = (req: Request): boolean =>
  isOwner(req.headers.get("cookie"), process.env.OWNER_KEY);
