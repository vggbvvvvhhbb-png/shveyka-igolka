/**
 * Публикация поста в канал.
 *
 * Бот сам пишет в канал: текст и кнопки под ним. Так владелец не публикует
 * посты руками — достаточно одной команды в чате с ботом.
 *
 * Чтобы бот мог писать в канал, его нужно назначить администратором канала
 * с правом публикации сообщений.
 */

import { Bot, GrammyError } from "grammy";
import { config } from "./config";
import { channelKeyboard, channelPostText, escapeHtml, truncate } from "./lib/channel";
import type { MyContext } from "./session";

/** Понятная причина, по которой пост не ушёл. */
export class ChannelPublishError extends Error {}

/** Что нужно знать про опубликованный пост. */
export interface PublishedPost {
  /** Идентификатор сообщения в канале. */
  messageId: number;
}

/** Параметры публикации. Пустые — берутся из настроек. */
export interface PublishOptions {
  /** Свой текст поста вместо заготовленного. */
  text?: string;
  /** Чат канала: @username или -100… . */
  chatId?: string;
  /** Адрес сайта для кнопок. */
  siteUrl?: string;
  /** Логин бота для кнопки «Спросить бота». */
  botUsername?: string;
}

/**
 * Публикует пост в канал: короткий текст и кнопки под ним.
 *
 * @param bot бот, которым публикуем
 * @param options свой текст и адреса для кнопок
 */
export async function publishChannelPost(
  bot: Bot<MyContext>,
  options: PublishOptions = {}
): Promise<PublishedPost> {
  const chatId = (options.chatId ?? config.channelId).trim();
  if (!chatId) {
    throw new ChannelPublishError(
      "Канал не задан. Укажи CHANNEL_ID в apps/bot/.env — например @shveyka_igolka."
    );
  }

  const siteUrl = options.siteUrl ?? config.siteUrl;
  const custom = options.text?.trim();
  const text = custom ? truncate(escapeHtml(custom), 4000) : channelPostText();

  try {
    const botUsername = options.botUsername ?? (await bot.api.getMe()).username;
    const message = await bot.api.sendMessage(chatId, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: channelKeyboard({ siteUrl, botUsername }),
    });
    return { messageId: message.message_id };
  } catch (error) {
    if (error instanceof GrammyError) {
      if (error.error_code === 403) {
        throw new ChannelPublishError(
          "Бот не может писать в канал. Назначь его администратором канала с правом публикации сообщений."
        );
      }
      if (error.error_code === 400) {
        throw new ChannelPublishError(
          "Telegram не принял пост. Проверь CHANNEL_ID: для публичного канала это @username, для приватного — -100… ."
        );
      }
      throw new ChannelPublishError(`Telegram не принял пост: ${error.description}`);
    }
    throw new ChannelPublishError("Не удалось связаться с Telegram. Попробуй ещё раз.");
  }
}
