import { InlineKeyboard } from "grammy";
import { config } from "../config";
import type { MyContext } from "../session";

/**
 * Ссылка на страницу помощника с готовым вопросом.
 * Страница /assistant читает параметр ?q= и отправляет вопрос сама.
 */
export const aiLink = (prompt: string): string =>
  `${config.siteUrl}/assistant?q=${encodeURIComponent(prompt)}`;

/** Telegram не принимает сообщения длиннее 4096 символов — режем по абзацам. */
function splitMessage(text: string, limit = 3800): string[] {
  const out: string[] = [];
  let cur = "";
  for (const part of text.split("\n\n")) {
    if (cur && cur.length + part.length + 2 > limit) {
      out.push(cur);
      cur = part;
    } else {
      cur = cur ? `${cur}\n\n${part}` : part;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Отправляет HTML-текст; клавиатура прикрепляется к последнему куску. */
export async function sendHtml(ctx: MyContext, html: string, kb?: InlineKeyboard): Promise<void> {
  const chunks = splitMessage(html);
  for (let i = 0; i < chunks.length; i++) {
    await ctx.reply(chunks[i], {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: i === chunks.length - 1 ? kb : undefined,
    });
  }
}

/** Главное меню бота. */
export function mainMenu(): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("🧵 Раскрой ткани", "menu:cut")
    .text("💰 Выгодно ли шить?", "menu:profit")
    .row()
    .text("🔍 Аналог ткани", "menu:analog")
    .text("🧷 Фурнитура", "menu:hardware")
    .row()
    .text("🧼 Уход за тканью", "menu:care")
    .text("📊 Итоги месяца", "menu:stats");
  if (config.siteUrl) kb.row().url("🌐 Открыть сайт", config.siteUrl);
  return kb;
}

/** Кнопки под результатом: «спросить AI», «заново», «меню». */
export function resultKeyboard(opts: {
  /** Ключ сценария для кнопки «заново». */
  again: string;
  /** Готовый вопрос для помощника на сайте. */
  aiPrompt?: string;
}): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (config.siteUrl && opts.aiPrompt) {
    kb.url("🤖 Спросить помощника", aiLink(opts.aiPrompt)).row();
  }
  return kb.text("🔁 Заново", `menu:${opts.again}`).text("🏠 Меню", "menu:home");
}
