/**
 * Точка входа бота.
 *
 * Бот повторяет пять страниц-калькуляторов сайта: раскрой, выгода, аналог
 * ткани, фурнитура и уход. Расчёты берёт из packages/core — те же формулы, что
 * и на сайте, поэтому цифры всегда совпадают.
 *
 * Работает через long polling, без вебхуков.
 */

import { BOT_COMMANDS, createBot } from "./bot";
import { config } from "./config";
import { logger } from "./lib/logger";

const token = config.token;
if (!token) {
  logger.error("Не задан BOT_TOKEN. Скопируй .env.example в .env и впиши токен от @BotFather.");
  process.exit(1);
}

const bot = createBot(token);

await bot.api.setMyCommands(BOT_COMMANDS);

process.once("SIGINT", () => void bot.stop());
process.once("SIGTERM", () => void bot.stop());

await bot.start({
  onStart: (me) => logger.info(`Бот @${me.username} запущен`),
});
