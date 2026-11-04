/**
 * Поиск по справочнику.
 *
 * На сайте каталог можно фильтровать, а в боте — спросить словами: «лён»,
 * «волнистая строчка», «наволочка». Ответ приходит из того же API, что
 * пользуется страница каталога, поэтому списки совпадают.
 */

import { InlineKeyboard } from "grammy";
import { config } from "../config";
import { failureText, searchCatalog, type CatalogItem } from "../lib/api";
import { esc } from "../lib/html";
import { sendHtml } from "../lib/reply";
import type { MyContext } from "../session";
import type { Wizard } from "../wizard";

/** Сколько записей показываем кнопками. */
const MAX_BUTTONS = 12;

/** Значок раздела каталога. */
const KIND_ICON = {
  fabrics: "🧵",
  seams: "✂️",
  projects: "🧵",
} as const;

/** Адрес страницы записи каталога. */
function itemUrl(kind: keyof typeof KIND_ICON, slug: string): string {
  return `${config.siteUrl}/${kind}/${slug}`;
}

/** Собирает раздел ответа: значок, название и подсказка. */
function sectionLines(kind: keyof typeof KIND_ICON, items: CatalogItem[]): string[] {
  if (items.length === 0) return [];
  const lines = [
    `${KIND_ICON[kind]} <b>${kind === "fabrics" ? "Ткани" : kind === "seams" ? "Швы" : "Проекты"}</b>`,
  ];
  for (const item of items) {
    lines.push(`• <b>${esc(item.name)}</b>${item.hint ? ` — ${esc(item.hint)}` : ""}`);
  }
  return lines;
}

/** Показывает найденные записи и кнопки со ссылками на сайт. */
async function showResults(ctx: MyContext, query: string): Promise<void> {
  const result = await searchCatalog(query);
  if (!result.ok) {
    await ctx.reply(failureText(result.reason));
    return;
  }

  const { fabrics, seams, projects } = result.value;
  const total = fabrics.length + seams.length + projects.length;

  if (total === 0) {
    await ctx.reply(
      `По слову «${esc(query)}» в справочнике ничего не нашлось.\n\n` +
        "Попробуй другое слово — например, название ткани или вида шва. " +
        "Или спроси помощника: он знает и каталог, и интернет."
    );
    return;
  }

  const lines: string[] = [`<b>По запросу «${esc(query)}» нашлось ${total}</b>`, ""];
  lines.push(...sectionLines("fabrics", fabrics));
  if (fabrics.length && (seams.length || projects.length)) lines.push("");
  lines.push(...sectionLines("seams", seams));
  if (seams.length && projects.length) lines.push("");
  lines.push(...sectionLines("projects", projects));

  const kb = new InlineKeyboard();
  let buttons = 0;
  // Кнопка-ссылка в телеграме требует полный адрес: без адреса сайта
  // кнопок с записями не будет, останутся подписи в тексте.
  if (config.siteUrl) {
    for (const [kind, items] of [
      ["fabrics", fabrics],
      ["seams", seams],
      ["projects", projects],
    ] as const) {
      for (const item of items) {
        if (buttons >= MAX_BUTTONS) break;
        kb.url(`${KIND_ICON[kind]} ${item.name}`, itemUrl(kind, item.slug));
        buttons += 1;
      }
    }
  }
  if (config.siteUrl) {
    kb.row().url(
      "🤖 Спросить помощника",
      `${config.siteUrl}/assistant?q=${encodeURIComponent(query)}`
    );
  }
  kb.row().text("🔁 Искать ещё", "menu:find").text("🏠 Меню", "menu:home");

  await sendHtml(ctx, lines.join("\n"), kb);
}

/** Сценарий поиска по справочнику. */
export const searchWizard: Wizard = {
  id: "find",
  steps: [
    {
      kind: "text",
      key: "query",
      text: [
        "<b>Что ищем?</b>",
        "Напиши слово или фразу: например <code>лён</code>, <code>волнистая строчка</code> или <code>наволочка</code>.",
      ].join("\n"),
    },
  ],
  finish: async (ctx, data) => {
    const query = String(data.query ?? "").trim();
    if (query.length === 0) {
      await ctx.reply("Напиши, что ищем: например «лён».");
      return;
    }
    await showResults(ctx, query);
  },
};
