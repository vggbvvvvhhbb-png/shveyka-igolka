import { InlineKeyboard } from "grammy";
import {
  buildHardware,
  CLOSURE_LABELS,
  estimateTotal,
  HW_GARMENT_LABELS,
  shoppingText,
  type HardwareInput,
} from "@shveyka/core/calculator/hardware";
import { rubRange } from "../lib/format";
import { esc } from "../lib/html";
import { num, oneOf, str } from "../lib/values";
import type { MyContext } from "../session";
import { opts, type Wizard } from "../wizard";

/** У юбки и брюк рукавов нет — про них не спрашиваем. */
const NO_SLEEVES: string[] = ["skirt", "pants"];
const noSleeves = (garment: string): boolean => NO_SLEEVES.includes(garment);

/** Сколько нужно фурнитуры: список покупок к изделию. */
export const hardwareWizard: Wizard = {
  id: "hardware",
  steps: [
    {
      key: "garment",
      kind: "choice",
      cols: 3,
      text: "🧷 <b>Сколько нужно фурнитуры</b>\n\nЧто шьём?",
      options: opts(HW_GARMENT_LABELS),
    },
    {
      key: "size",
      kind: "number",
      min: 36,
      max: 70,
      presets: [44, 46, 48, 50, 52, 54, 56],
      text: "Какой размер? Нажми кнопку или напиши число.",
    },
    {
      key: "closure",
      kind: "choice",
      text: "Чем будет застёгиваться изделие?",
      options: opts(CLOSURE_LABELS),
    },
    {
      key: "longSleeve",
      kind: "yesno",
      when: (d) => !noSleeves(str(d, "garment")),
      text: "Рукава длинные?",
    },
    {
      key: "collar",
      kind: "yesno",
      when: (d) => !noSleeves(str(d, "garment")),
      text: "Есть воротник?",
    },
    {
      key: "pockets",
      kind: "number",
      min: 0,
      max: 10,
      presets: [0, 1, 2, 3, 4],
      text: "Сколько карманов?",
    },
    {
      key: "hood",
      kind: "yesno",
      when: (d) => str(d, "garment") === "jacket" || str(d, "garment") === "coat",
      text: "Есть капюшон?",
    },
    {
      key: "elasticWaist",
      kind: "yesno",
      when: (d) => ["skirt", "pants", "dress"].includes(str(d, "garment")),
      text: "Пояс на резинке?",
    },
    {
      key: "elasticCuffs",
      kind: "yesno",
      when: (d) => d.longSleeve === true,
      text: "Манжеты на резинке?",
    },
    {
      key: "overlock",
      kind: "yesno",
      text: "Будешь обрабатывать швы на оверлоке? (нужны отдельные нитки)",
    },
    {
      key: "contrastTopstitch",
      kind: "yesno",
      text: "Нужна контрастная отделочная строчка?",
    },
    {
      key: "fabricColor",
      kind: "text",
      skip: { label: "Пропустить", value: "" },
      text: "Какого цвета ткань? Подскажу цвет ниток.",
    },
  ],

  finish: async (ctx, d) => {
    const input: HardwareInput = {
      garment: oneOf(d, "garment", HW_GARMENT_LABELS, "dress"),
      size: num(d, "size"),
      closure: oneOf(d, "closure", CLOSURE_LABELS, "buttons"),
      longSleeve: d.longSleeve === true,
      collar: d.collar === true,
      pockets: num(d, "pockets"),
      hood: d.hood === true,
      elasticWaist: d.elasticWaist === true,
      elasticCuffs: d.elasticCuffs === true,
      overlock: d.overlock === true,
      contrastTopstitch: d.contrastTopstitch === true,
      fabricColor: str(d, "fabricColor").trim() || undefined,
    };
    ctx.session.hw = { input, have: [] };
    const { text, kb } = render(input, []);
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
  },
};

/** Текст результата и кнопки «есть дома». */
function render(input: HardwareInput, have: string[]) {
  const items = buildHardware(input);

  const lines = items.map((it) => {
    const head = `<b>${esc(it.name)}</b>: ${esc(it.qty)}`;
    if (have.includes(it.id)) return `✅ <s>${head}</s> (есть дома)`;
    const note = it.note ? `\n    <i>${esc(it.note)}</i>` : "";
    return `⬜️ ${head}${note}\n    ~${rubRange(it.price)}`;
  });

  const total = estimateTotal(items, have);
  const text = [
    `🧷 <b>Фурнитура: ${esc(HW_GARMENT_LABELS[input.garment])}, размер ${input.size}</b>`,
    lines.join("\n\n"),
    `<b>Итого купить: ~${rubRange(total)}</b> <i>(цены примерные)</i>`,
    "Нажми на позицию, если она уже есть дома: я её вычеркну.",
  ].join("\n\n");

  const kb = new InlineKeyboard();
  for (const it of items) {
    const done = have.includes(it.id);
    const short = it.name.split(" (")[0];
    kb.text(`${done ? "↩️ Вернуть" : "🏠 Есть дома"}: ${short}`, `hw:${it.id}`).row();
  }
  kb.text("📋 Список для магазина", "hw:list").row();
  kb.text("🔁 Заново", "menu:hardware").text("🏠 Меню", "menu:home");

  return { text, kb, items };
}

/** Нажатия «Есть дома» и «Список для магазина». */
export async function handleHardwareCallback(ctx: MyContext): Promise<void> {
  const hw = ctx.session.hw;
  if (!hw) {
    await ctx.answerCallbackQuery({
      text: "Расчёт устарел. Посчитай заново: /hardware",
      show_alert: true,
    });
    return;
  }
  const id = (ctx.callbackQuery?.data ?? "").slice(3);
  const items = buildHardware(hw.input);

  if (id === "list") {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📋 <b>Список для магазина</b>\n\n<pre>${esc(shoppingText(items, hw.have))}</pre>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  if (!items.some((i) => i.id === id)) {
    await ctx.answerCallbackQuery();
    return;
  }
  hw.have = hw.have.includes(id) ? hw.have.filter((x) => x !== id) : [...hw.have, id];
  await ctx.answerCallbackQuery();
  const { text, kb } = render(hw.input, hw.have);
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb }).catch(() => undefined);
}
