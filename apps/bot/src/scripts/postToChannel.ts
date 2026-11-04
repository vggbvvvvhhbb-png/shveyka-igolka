/**
 * Публикация поста в канал из командной строки.
 *
 * Нужен, когда бот не запущен: `pnpm bot:post`. Свой текст можно передать
 * аргументом — иначе бот берёт заготовку с кнопками.
 */

import { Bot } from "grammy";
import { ChannelPublishError, publishChannelPost } from "../channel";
import { config } from "../config";
import { logger } from "../lib/logger";
import type { MyContext } from "../session";

const token = config.token;
if (!token) {
  logger.error("Не задан BOT_TOKEN. Скопируй .env.example в .env и впиши токен от @BotFather.");
  process.exit(1);
}

const bot = new Bot<MyContext>(token);
const text = process.argv.slice(2).join(" ").trim();

try {
  const post = await publishChannelPost(bot, { text: text || undefined });
  logger.info(`Опубликовано: сообщение ${post.messageId}`);
} catch (error) {
  if (error instanceof ChannelPublishError) {
    logger.error(`Не получилось опубликовать: ${error.message}`);
  } else {
    logger.error("Не получилось опубликовать пост", error);
  }
  process.exit(1);
}
