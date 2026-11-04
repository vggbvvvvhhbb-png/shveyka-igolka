/**
 * Сборка бота: команда, кнопки, сценарии и память о пользователе.
 *
 * Отдельно от точки входа, чтобы поведение бота можно было проверить в тестах
 * без сети.
 */

import path from "node:path";
import { FileAdapter } from "@grammyjs/storage-file";
import { Bot, GrammyError, HttpError, session } from "grammy";
import { config } from "./config";
import { analogWizard } from "./flows/analog";
import { assistantWizard, handleAssistantCallback } from "./flows/assistant";
import { careWizard, sendCareQr } from "./flows/care";
import { cutWizard } from "./flows/cut";
import { handleHardwareCallback, hardwareWizard } from "./flows/hardware";
import { startMeasure, measureWizard } from "./flows/measure";
import { profitWizard, showStats } from "./flows/profit";
import { searchWizard } from "./flows/search";
import { registerJournal } from "./journal";
import { logger } from "./lib/logger";
import { mainMenu } from "./lib/reply";
import { initialSession, type MyContext, type SessionData } from "./session";
import {
  cancelWizard,
  handleWizardCallback,
  handleWizardText,
  registerWizard,
  startWizard,
  type Wizard,
} from "./wizard";

/** Сценарии бота: ключ — команда и префикс кнопок меню. */
const FLOWS: Record<string, Wizard> = {
  cut: cutWizard,
  profit: profitWizard,
  analog: analogWizard,
  hardware: hardwareWizard,
  care: careWizard,
  find: searchWizard,
  ask: assistantWizard,
};
Object.values(FLOWS).forEach(registerWizard);
// Мерки запускаются отдельной командой: перед вопросами бот подставляет
// то, что уже записано.
registerWizard(measureWizard);

/** Команды, которые бот показывает в меню Telegram. */
export const BOT_COMMANDS = [
  { command: "menu", description: "Главное меню" },
  { command: "calc", description: "Раскрой ткани" },
  { command: "profit", description: "Выгодно ли шить самой" },
  { command: "analog", description: "Подбор аналога ткани" },
  { command: "hardware", description: "Сколько фурнитуры" },
  { command: "care", description: "Уход за тканью" },
  { command: "measure", description: "Мои мерки" },
  { command: "find", description: "Поиск по справочнику" },
  { command: "ask", description: "Спросить помощника" },
  { command: "stats", description: "Итоги месяца" },
  { command: "sewn", description: "Записать сшитую вещь" },
  { command: "year", description: "Итоги года" },
  { command: "help", description: "Список команд" },
  { command: "cancel", description: "Прервать расчёт" },
];

const HELP_TEXT = [
  "Команды:",
  "/calc — раскрой ткани (то же самое, что /cut)",
  "/profit — выгодно ли шить самой",
  "/analog — подбор аналога ткани",
  "/hardware — сколько фурнитуры",
  "/care — уход за тканью",
  "/measure — мои мерки: обхват груди, талии, бёдер и рост",
  "/find — поиск по справочнику: ткани, швы, проекты",
  "/ask — спросить помощника: каталог, поиск, рассуждение, ресёрч",
  "/stats — итоги месяца",
  "/sewn название; затраты; цена в магазине; ткань — записать сшитую вещь",
  "/year — итоги года",
  "/cancel — прервать расчёт",
  "/menu — главное меню",
].join("\n");

/**
 * Данные о боте. Нужны только в тестах: чтобы не ходить в сеть за getMe.
 */
export type BotInfo = NonNullable<NonNullable<ConstructorParameters<typeof Bot>[1]>["botInfo"]>;

/**
 * Собирает готового к запуску бота.
 *
 * @param token токен от @BotFather
 * @param dataDir папка для состояния диалогов и истории проектов
 * @param botInfo данные о боте — в проде их grammY получит сам
 */
export function createBot(
  token: string,
  dataDir: string = config.dataDir,
  botInfo?: BotInfo
): Bot<MyContext> {
  const bot = new Bot<MyContext>(token, botInfo ? { botInfo } : undefined);

  // ---------- Доступ только для своих (если задан ALLOWED_USER_IDS) ----------
  if (config.allowedIds.length > 0) {
    bot.use(async (ctx, next) => {
      if (ctx.from && config.allowedIds.includes(ctx.from.id)) {
        await next();
        return;
      }
      await ctx.reply("Этот бот пока приватный 🔒").catch(() => undefined);
    });
  }

  // ---------- Память о пользователе (на диске, переживает перезапуск) ----------
  bot.use(
    session({
      initial: initialSession,
      storage: new FileAdapter<SessionData>({
        dirName: path.join(dataDir, "sessions"),
      }),
      // Сессия — по пользователю: так история не теряется даже там, где у
      // обновления нет чата (например, нажатие на кнопку без сообщения).
      getSessionKey: (ctx) => (ctx.from?.id ?? ctx.chatId)?.toString(),
    })
  );

  // ---------- Меню и команды ----------
  const showMenu = async (ctx: MyContext, greeting = false): Promise<void> => {
    await cancelWizard(ctx);
    const text = greeting
      ? [
          "Привет! 👋 Я помощник Швейки.",
          "",
          "Посчитаю ткань, прикину выгоду, подберу аналог, посчитаю фурнитуру и расскажу про уход.",
          "Ещё найду нужную ткань, шов или проект в справочнике и отвечу на вопрос — так же, как на сайте.",
          "",
          "Что сделаем?",
        ].join("\n")
      : "Что сделаем?";
    await ctx.reply(text, { reply_markup: mainMenu() });
  };

  /** Запускает сценарий по ключу из меню или команды. */
  const startFlow = async (ctx: MyContext, key: string): Promise<void> => {
    if (key === "home") {
      await showMenu(ctx);
      return;
    }
    if (key === "stats") {
      await cancelWizard(ctx);
      await showStats(ctx);
      return;
    }
    // Мерки: перед вопросами нужно подставить уже записанные значения.
    if (key === "measure") {
      await cancelWizard(ctx);
      await startMeasure(ctx);
      return;
    }
    const wizard = FLOWS[key];
    if (wizard) await startWizard(ctx, wizard);
  };

  bot.command("start", (ctx) => showMenu(ctx, true));
  bot.command("menu", (ctx) => showMenu(ctx));
  bot.command("stats", (ctx) => startFlow(ctx, "stats"));
  bot.command("help", (ctx) => ctx.reply(HELP_TEXT));
  bot.command("cancel", async (ctx) => {
    const had = await cancelWizard(ctx);
    await ctx.reply(had ? "Отменено." : "Сейчас ничего не считаем.", {
      reply_markup: mainMenu(),
    });
  });
  for (const key of Object.keys(FLOWS)) {
    bot.command(key, (ctx) => startFlow(ctx, key));
  }
  // /calc — понятное имя для раскроя
  bot.command("calc", (ctx) => startFlow(ctx, "cut"));
  // /measure — мерки: сценарий подставляет прежние значения
  bot.command("measure", (ctx) => startFlow(ctx, "measure"));

  // ---------- Журнал шитья: те же записи, что и на странице ----------
  // Команды регистрируем до общего обработчика текста: иначе сообщение
  // перехватит bot.on("message:text") и до /sewn и /year не дойдёт.
  registerJournal(bot, config.webApiUrl, config.ownerKey);

  // ---------- Кнопки ----------
  bot.callbackQuery(/^menu:(\w+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await startFlow(ctx, ctx.match[1]);
  });
  bot.callbackQuery(/^hw:/, handleHardwareCallback);
  bot.callbackQuery("care:qr", sendCareQr);
  bot.callbackQuery("ask:more", handleAssistantCallback);
  bot.on("callback_query:data", async (ctx, next) => {
    if (await handleWizardCallback(ctx)) return;
    await next();
  });
  bot.on("callback_query:data", (ctx) => ctx.answerCallbackQuery());

  // ---------- Обычные сообщения ----------
  bot.on("message:text", async (ctx) => {
    if (await handleWizardText(ctx)) return;
    await ctx.reply("Выбери, что посчитать 👇", { reply_markup: mainMenu() });
  });

  // ---------- Ошибки ----------
  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) logger.error("Ошибка Telegram API", e.description);
    else if (e instanceof HttpError) logger.error("Нет связи с Telegram", e);
    else logger.error("Ошибка в боте", e);
    err.ctx.reply("Что-то пошло не так 😕 Попробуй ещё раз: /start").catch(() => undefined);
  });

  return bot;
}
