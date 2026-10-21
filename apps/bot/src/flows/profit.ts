import {
  calcProfit,
  DEFAULT_PROFIT_INPUT,
  monthStats,
  type ProfitInput,
  type ProjectEntry,
} from "@shveyka/core/calculator/profit";
import { countPhrase, rub } from "../lib/format";
import { esc } from "../lib/html";
import { mainMenu, resultKeyboard, sendHtml } from "../lib/reply";
import { num, str } from "../lib/values";
import type { MyContext } from "../session";
import type { Step, Wizard } from "../wizard";

/** Денежный вопрос: сумма в рублях, с «пропустить» вместо нуля. */
const money = (key: string, text: string, skipLabel?: string, presets?: number[]): Step => ({
  key,
  kind: "number",
  text,
  min: 0,
  max: 10_000_000,
  presets,
  skip: skipLabel ? { label: skipLabel, value: 0 } : undefined,
});

/** Сегодняшняя дата в формате ГГГГ-ММ-ДД — в таком виде её ждёт monthStats. */
const today = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Выгодно ли шить самой: полная себестоимость против цены в магазине. */
export const profitWizard: Wizard = {
  id: "profit",
  steps: [
    money(
      "fabric",
      "💰 <b>Выгодно ли шить самой?</b>\n\nСколько стоит ткань целиком (метраж × цена), ₽?"
    ),
    money("lining", "Подкладка, ₽?", "Без подкладки"),
    money("hardware", "Фурнитура (пуговицы, молнии, резинки), ₽?", "Нет / есть дома"),
    money("thread", "Нитки, ₽?", "Свои, не считаю"),
    money("interfacing", "Дублирин / флизелин, ₽?", "Не нужен"),
    {
      key: "hours",
      kind: "number",
      min: 0,
      max: 1000,
      text: "Сколько часов уйдёт на пошив (вместе с раскроем)?",
    },
    money(
      "hourlyRate",
      "Сколько стоит твой час работы, ₽? Если свой труд считать не хочешь — пропусти.",
      "Не учитывать",
      [100, 200, 300]
    ),
    money("toolWearPerHour", "Износ машинки и оверлока, ₽ за час работы?", "Не считать"),
    money(
      "electricityPerHour",
      "Электричество, ₽ за час? В среднем около 10 ₽.",
      "Не считать",
      [10]
    ),
    money("shopPrice", "Сколько стоит похожая вещь в магазине, ₽?"),
    {
      key: "title",
      kind: "text",
      skip: { label: "Не сохранять", value: "" },
      text: "Как назвать изделие? Я сохраню его в историю и покажу итоги месяца (/stats).",
    },
    {
      key: "gift",
      kind: "yesno",
      when: (d) => Boolean(str(d, "title")),
      text: "Это подарок? Подарки не считаются в экономию.",
    },
  ],

  finish: async (ctx, d) => {
    const input: ProfitInput = {
      ...DEFAULT_PROFIT_INPUT,
      fabric: num(d, "fabric"),
      lining: num(d, "lining"),
      hardware: num(d, "hardware"),
      thread: num(d, "thread"),
      interfacing: num(d, "interfacing"),
      hours: num(d, "hours"),
      hourlyRate: num(d, "hourlyRate"),
      toolWearPerHour: num(d, "toolWearPerHour"),
      electricityPerHour: num(d, "electricityPerHour"),
      shopPrice: num(d, "shopPrice"),
    };
    const r = calcProfit(input);

    const rows = [`Материалы: ${rub(r.materials)}`];
    if (r.labor > 0) rows.push(`Твой труд: ${rub(r.labor)}`);
    if (r.tools > 0) rows.push(`Износ оборудования: ${rub(r.tools)}`);
    if (r.electricity > 0) rows.push(`Электричество: ${rub(r.electricity)}`);

    const parts = [
      "💰 <b>Выгодно ли шить самой?</b>",
      rows.join("\n"),
      `<b>Себестоимость: ${rub(r.cost)}</b>`,
    ];
    if (input.shopPrice > 0) {
      parts.push(`В магазине: ${rub(input.shopPrice)}`);
      parts.push(
        r.saved > 0
          ? `✅ <b>Экономия: ${rub(r.saved)} (${r.savedPercent}%)</b>`
          : `❌ <b>Готовая вещь дешевле на ${rub(Math.abs(r.saved))}</b>`
      );
    }
    parts.push(r.messages.map((m) => `• ${esc(m)}`).join("\n"));

    // Сохранение в историю
    const title = str(d, "title").trim();
    if (title && r.cost > 0) {
      const entry: ProjectEntry = {
        id: Date.now(),
        title,
        date: today(),
        gift: d.gift === true,
        cost: r.cost,
        shopPrice: input.shopPrice,
      };
      ctx.session.projects = [...ctx.session.projects, entry].slice(-200);
      parts.push(`💾 Сохранено в историю: «${esc(entry.title)}». Итоги месяца: /stats`);
    }

    await sendHtml(
      ctx,
      parts.join("\n\n"),
      resultKeyboard({
        again: "profit",
        aiPrompt: `Стоит ли шить самой вещь, если материалы стоят ${Math.round(r.materials)} ₽, на пошив уйдёт ${input.hours} ч, а в магазине такая стоит ${Math.round(input.shopPrice)} ₽?`,
      })
    );
  },
};

/** Текст для /stats. */
export function statsHtml(projects: ProjectEntry[]): string {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = now.toLocaleDateString("ru-RU", { month: "long" });
  const s = monthStats(projects, ym);

  if (s.count === 0) {
    return `📊 За ${month} в истории пока пусто. Посчитай изделие в разделе «Выгодно ли шить?» и сохрани его.`;
  }

  const lines = [
    `📊 <b>Итоги: ${month}</b>`,
    `Сшито: ${countPhrase(s.count, ["вещь", "вещи", "вещей"])}`,
  ];
  if (s.giftCount > 0) {
    lines.push(`Из них подарков: ${s.giftCount}, потрачено на них ${rub(s.giftSpent)}`);
  }
  lines.push(`Сэкономлено на вещах для себя: <b>${rub(s.savedTotal)}</b>`);

  const last = projects
    .slice(-5)
    .reverse()
    .map((p) => `${esc(p.title)}: себестоимость ${rub(p.cost)}${p.gift ? " (подарок)" : ""}`);
  if (last.length) lines.push(`<b>Последние изделия</b>\n${last.map((l) => `• ${l}`).join("\n")}`);

  return lines.join("\n\n");
}

/** Показывает итоги месяца. */
export async function showStats(ctx: MyContext): Promise<void> {
  await sendHtml(ctx, statsHtml(ctx.session.projects), mainMenu());
}
