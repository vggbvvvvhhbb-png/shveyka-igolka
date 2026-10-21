import {
  calculateCutting,
  CUT_DIRECTION_LABELS,
  describeResult,
  GARMENT_LABELS,
  PATTERN_LABELS,
  ROLL_WIDTHS,
  type CuttingInput,
} from "@shveyka/core/calculator/cutting";
import { meters, parseNum } from "../lib/format";
import { bullets, esc, section } from "../lib/html";
import { resultKeyboard, sendHtml } from "../lib/reply";
import { num, numList, oneOf, strList } from "../lib/values";
import { opts, type Wizard } from "../wizard";

const SIZES = [44, 46, 48, 50, 52, 54, 56];

/** Раскрой: сколько метров ткани брать и какая ширина рулона выгоднее. */
export const cutWizard: Wizard = {
  id: "cut",
  steps: [
    {
      key: "garment",
      kind: "choice",
      cols: 3,
      text: "🧵 <b>Раскрой ткани</b>\n\nЧто шьём?",
      options: opts(GARMENT_LABELS),
    },
    {
      key: "size",
      kind: "number",
      min: 36,
      max: 70,
      presets: SIZES,
      text: "Какой размер? Нажми кнопку или напиши число.",
    },
    {
      key: "widths",
      kind: "multi",
      min: 1,
      text: "Какая ширина ткани в рулоне? Можно выбрать несколько — я сравню, какая выгоднее.",
      options: ROLL_WIDTHS.map((w) => [`${w} см`, String(w)]),
    },
    {
      key: "prices",
      kind: "text",
      skip: { label: "Не знаю цен", value: "" },
      text: (d) => {
        const widths = strList(d, "widths");
        return (
          `Цена за метр для каждой ширины (${widths.join(", ")} см), в том же порядке, через пробел.\n` +
          `Например: <code>${widths.map((_, i) => 450 + i * 50).join(" ")}</code>\n` +
          `Если для какой-то ширины цены нет, поставь «-».`
        );
      },
      parse: (s, d) => {
        const n = strList(d, "widths").length;
        const tokens = s
          .replace(/₽|руб\.?|р\./gi, " ")
          .split(/[\s;]+/)
          .filter(Boolean);
        if (tokens.length !== n) {
          return { error: `Нужно ${n} знач. через пробел, а получено ${tokens.length}.` };
        }
        const prices: (number | undefined)[] = [];
        for (const t of tokens) {
          if (t === "-") {
            prices.push(undefined);
            continue;
          }
          const v = parseNum(t);
          if (v === null) return { error: `«${t}» — не число. Пример: 450 500` };
          prices.push(v);
        }
        return { value: prices };
      },
    },
    {
      key: "pattern",
      kind: "choice",
      text: "Есть ли у ткани рисунок или ворс?",
      options: [
        ["Без рисунка и ворса", "none"],
        ["Ворс (бархат, вельвет)", "nap"],
        ["Клетка или полоска", "check"],
      ],
    },
    {
      key: "direction",
      kind: "choice",
      text: "Как кроим относительно нити?",
      options: [
        ["Вдоль нити (обычно)", "lengthwise"],
        ["Поперёк нити", "crosswise"],
      ],
    },
    {
      key: "shrink",
      kind: "number",
      min: 0,
      max: 10,
      presets: [0, 3, 5, 7],
      text: "Усадка ткани, %? Если ткань уже декатирована (постирана и отпарена) — 0.",
    },
    {
      key: "seam",
      kind: "number",
      min: 0.5,
      max: 5,
      presets: [1, 1.5, 2],
      skip: { label: "1.5 см (стандарт)", value: 1.5 },
      text: "Припуск на швы, см?",
    },
  ],

  finish: async (ctx, d) => {
    const widths = strList(d, "widths").map(Number);
    const prices = numList(d, "prices");

    const input: CuttingInput = {
      garment: oneOf(d, "garment", GARMENT_LABELS, "dress"),
      size: num(d, "size"),
      widths: widths.map((w, i) => ({ widthCm: w, pricePerMeter: prices[i] })),
      direction: oneOf(d, "direction", CUT_DIRECTION_LABELS, "lengthwise"),
      pattern: oneOf(d, "pattern", PATTERN_LABELS, "none"),
      seamAllowanceCm: num(d, "seam"),
      shrinkagePercent: num(d, "shrink"),
    };
    const r = calculateCutting(input);
    const best = r.bestByCost ?? r.bestByMeters;
    const garment = GARMENT_LABELS[input.garment];

    const html = [
      `🧵 <b>Раскрой: ${esc(garment)}, размер ${input.size}</b>`,
      `<b>Сколько ткани нужно</b>\n${bullets(describeResult(r))}`,
      widths.length > 1
        ? `📏 Меньше всего ткани уйдёт при ширине ${r.bestByMeters.widthCm} см: ${meters(r.bestByMeters.meters)}.`
        : "",
      `🛍 <b>Скажи в магазине:</b> «${meters(best.meters)}, ширина ${best.widthCm} см»`,
      section("Что учтено", r.notes),
    ]
      .filter(Boolean)
      .join("\n\n");

    await sendHtml(
      ctx,
      html,
      resultKeyboard({
        again: "cut",
        aiPrompt: `Помоги выбрать ткань и проверить раскрой: ${garment}, размер ${input.size}, нужно около ${meters(best.meters)} при ширине ${best.widthCm} см.`,
      })
    );
  },
};
