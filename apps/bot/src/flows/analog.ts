import {
  findAnalogs,
  findFabricByName,
  type AnalogItem,
  type AnalogQuery,
} from "@shveyka/core/calculator/analog";
import {
  DENSITY_LABELS,
  PURPOSE_LABELS,
  SEASON_LABELS,
  TRAIT_LABELS,
  type Purpose,
  type Season,
  type Trait,
} from "@shveyka/core/calculator/fabrics";
import { rub } from "../lib/format";
import { esc } from "../lib/html";
import { resultKeyboard, sendHtml } from "../lib/reply";
import { maybeOneOf, num, str, strList } from "../lib/values";
import { opts, type Wizard } from "../wizard";

/** Сколько аналогов показываем за раз — остальные прячем под фразой «ещё N в базе». */
const MAX_SHOWN = 5;

function renderItem(a: AnalogItem, i: number): string {
  const f = a.fabric;
  const lines = [
    `<b>${i + 1}. ${esc(f.name)}</b>: ${rub(f.price)}/м, ширина ${f.widthCm} см`,
    `${esc(f.composition)} · ${DENSITY_LABELS[f.density].toLowerCase()}`,
  ];
  if (a.savingsPerMeter > 0) {
    lines.push(`💸 Дешевле на ${rub(a.savingsPerMeter)}/м (${a.savingsPercent}%)`);
  } else if (a.savingsPerMeter < 0) {
    lines.push(`Дороже на ${rub(Math.abs(a.savingsPerMeter))}/м`);
  }
  lines.push(`✅ ${esc(f.pros)}`);
  lines.push(`⚠️ ${esc(f.cons)}`);
  for (const diff of a.differences) lines.push(`↔️ ${esc(diff)}`);
  if (f.shop) lines.push(`🛒 ${esc(f.shop)}`);
  return lines.join("\n");
}

/** Подбор аналога ткани: ищем похожую подешевле. */
export const analogWizard: Wizard = {
  id: "analog",
  steps: [
    {
      key: "name",
      kind: "text",
      skip: { label: "Не знаю, подбери по параметрам", value: "" },
      text: "🔍 <b>Подбор аналога ткани</b>\n\nКакую ткань хочешь заменить? Напиши название: лён, шерсть, драп, шёлк…",
    },
    {
      key: "purpose",
      kind: "choice",
      text: "Для чего ткань?",
      options: [...opts(PURPOSE_LABELS), ["Любое", "any"]],
    },
    {
      key: "season",
      kind: "choice",
      text: "На какой сезон?",
      options: [...opts(SEASON_LABELS), ["Любой", "any"]],
    },
    {
      key: "price",
      kind: "number",
      min: 0,
      max: 1_000_000,
      skip: { label: "Не знаю", value: 0 },
      // если исходная ткань есть в базе, цену возьмём оттуда
      when: (d) => !findFabricByName(str(d, "name")),
      text: "Сколько стоит исходная ткань за метр, ₽? Нужно, чтобы посчитать экономию.",
    },
    {
      key: "onlyCheaper",
      kind: "yesno",
      text: "Показывать только более дешёвые аналоги?",
    },
    {
      key: "traits",
      kind: "multi",
      text: "Что для тебя важно? Можно отметить несколько и нажать «Готово».",
      options: opts(TRAIT_LABELS),
    },
  ],

  finish: async (ctx, d) => {
    const name = str(d, "name").trim();
    const purpose = maybeOneOf<Purpose>(d, "purpose", PURPOSE_LABELS);
    const season = maybeOneOf<Season>(d, "season", SEASON_LABELS);
    const traits = strList(d, "traits").filter((t): t is Trait => Object.hasOwn(TRAIT_LABELS, t));
    const price = num(d, "price");

    const q: AnalogQuery = {
      name: name || undefined,
      purpose,
      season,
      pricePerMeter: price > 0 ? price : undefined,
      traits,
      onlyCheaper: d.onlyCheaper === true,
    };
    const r = findAnalogs(q);

    const parts: string[] = [
      `🔍 <b>${r.original ? `Аналоги для: ${esc(r.original.name)}` : "Подбор по параметрам"}</b>`,
    ];
    if (r.original) {
      parts.push(`Исходная ткань: ${esc(r.original.composition)}, ${rub(r.original.price)}/м`);
    } else if (name) {
      parts.push(
        `ℹ️ Ткани «${esc(name)}» нет в моей базе, поэтому подбираю по остальным параметрам.`
      );
    }
    for (const w of r.warnings) parts.push(`⚠️ <b>Важно:</b> ${esc(w)}`);

    if (r.analogs.length === 0) {
      parts.push(
        "Ничего не нашлось. Попробуй убрать часть условий: например, не ограничивать сезон или свойства."
      );
    } else {
      parts.push(...r.analogs.slice(0, MAX_SHOWN).map(renderItem));
      if (r.analogs.length > MAX_SHOWN) {
        parts.push(
          `…и ещё ${r.analogs.length - MAX_SHOWN} в базе. Сузь условия, чтобы увидеть лучшие.`
        );
      }
      parts.push("<i>Цены в базе примерные, уточняй в магазине.</i>");
    }

    await sendHtml(
      ctx,
      parts.join("\n\n"),
      resultKeyboard({
        again: "analog",
        aiPrompt: `Подбери аналог ткани${name ? ` «${name}»` : ""}${purpose ? `, назначение: ${PURPOSE_LABELS[purpose]}` : ""}${season ? `, сезон: ${SEASON_LABELS[season]}` : ""}.`,
      })
    );
  },
};
