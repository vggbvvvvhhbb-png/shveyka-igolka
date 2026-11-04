/**
 * Помощник в боте.
 *
 * Те же четыре режима, что и на сайте: «Каталог» отвечает по данным
 * справочника, «Поиск», «Рассуждение» и «Ресёрч» ходят в интернет и
 * отвечают со ссылками на источники.
 *
 * Ответы спрашиваются у сайта: там же считаются лимиты, там же живёт
 * история диалога, поэтому бот и страница отвечают одинаково.
 */

import { InlineKeyboard } from "grammy";
import { askCatalog, askWeb, failureText, type AssistantAnswer } from "../lib/api";
import { esc } from "../lib/html";
import { markdownToTelegramHtml } from "../lib/markdown";
import { sendHtml } from "../lib/reply";
import type { MyContext } from "../session";
import { opts, startWizard, type Wizard } from "../wizard";

/** Режимы работы помощника: значение — для API, подпись — для кнопки. */
const MODES = {
  chat: "🗂 Каталог — быстрый ответ по справочнику",
  search: "🌐 Поиск — ответ из интернета со ссылками",
  reason: "🧠 Рассуждение — разбор задачи по шагам",
  research: "🔬 Ресёрч — отчёт по нескольким источникам",
} as const;

/** Режимы работы, которые ходят в интернет. */
type WebMode = "search" | "reason" | "research";

/** Сколько источников показываем кнопками. */
const MAX_SOURCE_BUTTONS = 6;

/** Проверяет, что режим — веб-режим. */
function isWebMode(mode: string): mode is WebMode {
  return mode === "search" || mode === "reason" || mode === "research";
}

/** Кнопки под ответом: источники, ещё вопрос и меню. */
function answerKeyboard(answer: AssistantAnswer | null): InlineKeyboard {
  const kb = new InlineKeyboard();
  const sources = answer?.sources ?? [];
  for (const source of sources.slice(0, MAX_SOURCE_BUTTONS)) {
    if (!source.url.startsWith("http")) continue;
    kb.url(`🔗 ${source.title.slice(0, 40)}`, source.url);
  }
  if (sources.length > 0) kb.row();
  kb.text("➕ Ещё вопрос", "ask:more").text("🏠 Меню", "menu:home");
  return kb;
}

/** Показывает ответ режима с интернетом. */
async function showWebAnswer(ctx: MyContext, answer: AssistantAnswer): Promise<void> {
  const lines: string[] = [markdownToTelegramHtml(answer.answer)];

  if (answer.degraded) {
    lines.push("", `<i>${esc(answer.degraded)}</i>`);
  }

  const steps = answer.steps.filter(Boolean);
  if (steps.length > 0) {
    lines.push("", "<b>Как искал</b>");
    for (const step of steps) lines.push(`• ${esc(step)}`);
  }

  const sources = answer.sources.filter((source) => source.title);
  if (sources.length > 0) {
    lines.push("", "<b>Источники</b>");
    sources.slice(0, MAX_SOURCE_BUTTONS).forEach((source, index) => {
      lines.push(`${index + 1}. ${esc(source.title)}`);
    });
  }

  await sendHtml(ctx, lines.join("\n"), answerKeyboard(answer));
}

/** Показывает ответ режима «Каталог». */
async function showCatalogAnswer(ctx: MyContext, text: string): Promise<void> {
  await sendHtml(ctx, markdownToTelegramHtml(text), answerKeyboard(null));
}

/** Спрашивает помощника и показывает ответ. */
async function ask(ctx: MyContext, mode: string, question: string): Promise<void> {
  const conversationId = ctx.session.conversationId ?? null;
  // Кто спрашивает: по этому в отчёте видно, кто потратил токены.
  const user = ctx.from ? { id: ctx.from.id, name: ctx.from.first_name } : null;

  if (isWebMode(mode)) {
    const result = await askWeb(question, mode, conversationId, user);
    if (!result.ok) {
      await ctx.reply(failureText(result.reason));
      return;
    }
    if (result.value.conversationId) ctx.session.conversationId = result.value.conversationId;
    await showWebAnswer(ctx, result.value);
    return;
  }

  const result = await askCatalog(question, conversationId, user);
  if (!result.ok) {
    await ctx.reply(failureText(result.reason));
    return;
  }
  if (result.value.conversationId) ctx.session.conversationId = result.value.conversationId;
  await showCatalogAnswer(ctx, result.value.text);
}

/** Сценарий: выбрать режим, задать вопрос, получить ответ. */
export const assistantWizard: Wizard = {
  id: "ask",
  steps: [
    {
      kind: "choice",
      key: "mode",
      text: "<b>Как спросить?</b>\nВыбери режим работы помощника:",
      options: opts(MODES),
      cols: 1,
      // Режим уже выбран — шаг пропускается, когда диалог продолжается.
      when: (d) => !d.mode,
    },
    {
      kind: "text",
      key: "question",
      text: [
        "<b>Напиши вопрос</b>",
        "Например: <code>какая игла нужна для льна</code> или <code>как обработать срез муслина</code>.",
      ].join("\n"),
    },
  ],
  finish: async (ctx, data) => {
    const mode = String(data.mode ?? "chat");
    const question = String(data.question ?? "").trim();

    if (question.length === 0) {
      await ctx.reply("Напиши вопрос — например, какая игла нужна для льна.");
      return;
    }

    ctx.session.assistantMode = mode;
    await ctx.reply("Думаю…");
    await ask(ctx, mode, question);
  },
};

/**
 * Обработчик кнопки «Ещё вопрос»: продолжает диалог в том же режиме.
 *
 * Возвращает true, если нажатие обрабочено.
 */
export async function handleAssistantCallback(ctx: MyContext): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (data !== "ask:more") return false;

  await ctx.answerCallbackQuery();
  const mode = ctx.session.assistantMode ?? "chat";

  // Диалог продолжается с прошлого вопроса: режим уже выбран, спрашиваем заново.
  await startWizard(ctx, assistantWizard, { mode });
  return true;
}
