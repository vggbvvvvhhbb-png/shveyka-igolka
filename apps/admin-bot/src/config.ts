/**
 * Настройки админ-бота из переменных окружения.
 *
 * Файлы читаются по порядку: следующий перекрывает предыдущий.
 * Первым идёт apps/admin-bot/.env, затем корневой .env.
 */

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Корень пакета apps/admin-bot. */
export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Корень репозитория. */
export const repoRoot = path.resolve(packageRoot, "..", "..");

loadEnv({ path: path.join(packageRoot, ".env") });
loadEnv({ path: path.join(repoRoot, ".env") });

export const config = {
  /** Токен админ-бота от @BotFather. Пустой токен — бот не запустится. */
  token: process.env.ADMIN_BOT_TOKEN ?? "",
  /** База с таблицей расхода. */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Чат владельца. Пусто — владельцем станет тот, кто первым напишет /start. */
  ownerChatId: Number(process.env.ADMIN_CHAT_ID ?? "") || null,
  /** Папка для файлов состояния. */
  dataDir: path.resolve(packageRoot, process.env.ADMIN_DATA_DIR ?? "./data"),
  /** Адрес сайта: нужен для проверки, что сайт жив. */
  siteUrl: (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, ""),
  /** Час ежедневного отчёта по московскому времени. */
  reportHour: Number(process.env.ADMIN_REPORT_HOUR ?? 21),
  /** Цена миллиона токенов в рублях: нужна, чтобы считать деньги. */
  pricePerMillion: Number(process.env.ADMIN_TOKEN_PRICE_PER_MILLION ?? 0),
};
