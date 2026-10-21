/**
 * Подставной Telegram-контекст для тестов.
 *
 * Настоящий Telegram в тестах недоступен, поэтому собираем объект с теми же
 * методами, которыми пользуется бот, и записываем всё, что он отправил.
 */

import { initialSession, type MyContext } from "../session";
import { handleWizardCallback, handleWizardText } from "../wizard";

export interface Recorded {
  /** Отправленные сообщения. */
  sent: string[];
  /** Сообщения, которые отредактировали. */
  edited: string[];
  /** Всплывающие подсказки по нажатиям. */
  alerts: string[];
  /** Сколько картинок отправили. */
  photos: number;
}

export interface FakeBot {
  ctx: MyContext;
  log: Recorded;
  /** Нажатие inline-кнопки с данными callback_data. */
  press(data: string): Promise<boolean>;
  /** Готовит нажатие кнопки — для обработчиков вне движка диалогов. */
  setCallback(data: string): void;
  /** Обычное сообщение от пользователя. */
  say(text: string): Promise<boolean>;
  /** Последнее отправленное сообщение. */
  last(): string;
}

export function createBot(): FakeBot {
  const log: Recorded = { sent: [], edited: [], alerts: [], photos: 0 };
  const state = {
    session: initialSession(),
    chat: { id: 1 },
    from: { id: 1 },
    message: undefined as { text: string } | undefined,
    callbackQuery: undefined as { data: string } | undefined,
  };

  const ctx = {
    get session() {
      return state.session;
    },
    chat: state.chat,
    from: state.from,
    get message() {
      return state.message;
    },
    get callbackQuery() {
      return state.callbackQuery;
    },
    reply: async (text: string) => {
      log.sent.push(text);
      return { message_id: log.sent.length };
    },
    answerCallbackQuery: async (other?: { text?: string }) => {
      if (other?.text) log.alerts.push(other.text);
      return true;
    },
    editMessageText: async (text: string) => {
      log.edited.push(text);
      return true;
    },
    editMessageReplyMarkup: async () => true,
    replyWithPhoto: async () => {
      log.photos += 1;
      return { message_id: log.photos };
    },
    api: {
      editMessageReplyMarkup: async () => true,
    },
  };

  const bot: FakeBot = {
    ctx: ctx as unknown as MyContext,
    log,
    press: async (data: string) => {
      state.callbackQuery = { data };
      return handleWizardCallback(bot.ctx);
    },
    setCallback: (data: string) => {
      state.callbackQuery = { data };
    },
    say: async (text: string) => {
      state.message = { text };
      return handleWizardText(bot.ctx);
    },
    last: () => log.sent[log.sent.length - 1] ?? "",
  };
  return bot;
}
