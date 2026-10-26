/**
 * Настройки бота из переменных окружения.
 *
 * Файлы читаются в таком порядке: apps/bot/.env, затем корневой .env.
 * Переменные из apps/bot/.env имеют приоритет: dotenv не перезаписывает
 * уже заданные значения.
 */

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Корень пакета apps/bot. */
export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Корень репозитория. */
export const repoRoot = path.resolve(packageRoot, "..", "..");

loadEnv({ path: path.join(packageRoot, ".env") });
loadEnv({ path: path.join(repoRoot, ".env") });

export const config = {
  /** Токен бота от @BotFather. Пустой только в тестах — проверяется при старте. */
  token: process.env.BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? "",
  /** Адрес сайта без слеша в конце: нужен для ссылок на помощника и каталог. */
  siteUrl: (process.env.SITE_URL ?? "").replace(/\/+$/, ""),
  /** Папка, где бот хранит состояние диалогов и историю проектов. */
  dataDir: path.resolve(packageRoot, process.env.DATA_DIR ?? "./data"),
  /** Адрес сайта изнутри сети: бот пишет в тот же журнал, что и страница. */
  webApiUrl: (process.env.WEB_API_URL ?? "http://web:3000").replace(/\/+$/, ""),
  /**
   * Ключ владельца. Если он задан на сайте, замок закрывает журнал шитья и
   * бот должен показать ключ в cookie — иначе записи не пройдут.
   */
  ownerKey: process.env.OWNER_KEY ?? "",
  /** Telegram ID пользователей с доступом. Пусто — доступ у всех. */
  allowedIds: (process.env.ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n)),
};
