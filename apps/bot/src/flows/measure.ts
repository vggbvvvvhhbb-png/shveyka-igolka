/**
 * Мерки в боте.
 *
 * Те же мерки, что и на странице: обхват груди, талии, бёдер и рост. Бот
 * пишет их в ту же базу через API сайта, поэтому помощник и калькуляторы
 * видят одни и те же размеры.
 *
 * Мерки нужны помощнику: без них расчёт ткани на юбку получается «на глаз».
 */

import type { MeasurementsInput } from "@shveyka/core";
import { OWNER_COOKIE } from "@shveyka/core";
import { config } from "../config";
import { esc } from "../lib/html";
import { sendHtml } from "../lib/reply";
import type { MyContext } from "../session";
import { startWizard, type Wizard } from "../wizard";

const REQUEST_TIMEOUT_MS = 8000;
const UNAVAILABLE = "Сайт сейчас недоступен, попробуйте позже.";
const CLOSED = "Мерки на сайте закрыты ключом владельца. Бот должен знать его.";

/** Метка мерки в отчёте. */
const LABELS: Record<keyof MeasurementsInput, string> = {
  bust: "Обхват груди",
  waist: "Обхват талии",
  hip: "Обхват бёдер",
  height: "Рост",
};

/** Порядок вопросов. */
const FIELDS: (keyof MeasurementsInput)[] = ["bust", "waist", "hip", "height"];

/** Значение, которым помечается пропущенный вопрос. */
const SKIPPED = 0;

/**
 * Заголовки запроса к сайту.
 *
 * Мерки на сайте закрыты замком владельца: без ключа сайт отвечает 401.
 * Ключ у бота есть в переменной окружения.
 */
function headers(): Record<string, string> {
  return config.ownerKey
    ? {
        "Content-Type": "application/json",
        Cookie: `${OWNER_COOKIE}=${encodeURIComponent(config.ownerKey)}`,
      }
    : { "Content-Type": "application/json" };
}

/** Текущие мерки с сайта. */
async function fetchMeasurements(): Promise<Partial<MeasurementsInput>> {
  const res = await fetch(`${config.webApiUrl}/api/measurements`, {
    headers: headers(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 401) throw new Error("closed");
  if (!res.ok) throw new Error("measurements unavailable");
  const data = (await res.json()) as { measurements?: Partial<MeasurementsInput> | null };
  return data.measurements ?? {};
}

/** Текст: записанное значение или прочерк. */
function current(value: number | undefined): string {
  return value && value > 0 ? `${value} см` : "не записано";
}

/** Что сказать, когда мерки не пришли. */
async function explainFailure(ctx: MyContext, err: unknown): Promise<void> {
  if (err instanceof Error && err.message === "closed") {
    await ctx.reply(CLOSED);
    return;
  }
  await ctx.reply(UNAVAILABLE);
}

/**
 * Сценарий: записать мерки.
 *
 * Вопрос про каждую мерку можно пропустить — тогда остаётся то, что уже
 * записано. Так частично заполненные мерки не пропадают.
 */
export const measureWizard: Wizard = {
  id: "measure",
  steps: FIELDS.map((key) => ({
    kind: "number" as const,
    key,
    min: 30,
    max: 250,
    skip: { label: "Не знаю", value: SKIPPED },
    text: (d: Record<string, unknown>) =>
      [
        `<b>${LABELS[key]}</b>`,
        `Сейчас записано: ${current(d[key] as number | undefined)}.`,
        "Напиши число в сантиметрах или нажми «Не знаю».",
      ].join("\n"),
  })),
  finish: async (ctx, data) => {
    let previous: Partial<MeasurementsInput> = {};
    try {
      previous = await fetchMeasurements();
    } catch (err) {
      await explainFailure(ctx, err);
      return;
    }

    // Пропущенный вопрос не затирает прежнее значение.
    const payload: MeasurementsInput = {};
    for (const key of FIELDS) {
      const value = data[key];
      if (typeof value === "number" && value > 0) {
        payload[key] = value;
      } else if (previous[key] !== undefined) {
        payload[key] = previous[key];
      }
    }

    try {
      const res = await fetch(`${config.webApiUrl}/api/measurements`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status === 401) {
        await ctx.reply(CLOSED);
        return;
      }
      if (!res.ok) {
        await ctx.reply("Не удалось сохранить мерки, попробуйте позже.");
        return;
      }
    } catch {
      await ctx.reply(UNAVAILABLE);
      return;
    }

    const lines = ["Мерки сохранены:"];
    for (const key of FIELDS) {
      lines.push(`• ${LABELS[key]}: ${current(payload[key])}`);
    }
    lines.push("");
    lines.push("Теперь помощник и калькуляторы знают ваши размеры.");
    await sendHtml(ctx, lines.map(esc).join("\n"));
  },
};

/**
 * Команда /measure: показывает текущие мерки и спрашивает новые.
 *
 * Прежние значения подставляются в вопросы, поэтому человек видит, что
 * уже записано, и может оставить как есть.
 */
export async function startMeasure(ctx: MyContext): Promise<void> {
  let previous: Partial<MeasurementsInput> = {};
  try {
    previous = await fetchMeasurements();
  } catch (err) {
    await explainFailure(ctx, err);
    return;
  }

  const initial: Record<string, unknown> = {};
  for (const key of FIELDS) {
    initial[key] = previous[key] ?? SKIPPED;
  }
  await startWizard(ctx, measureWizard, initial);
}
