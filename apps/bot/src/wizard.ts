/**
 * Движок пошаговых диалогов: вопрос → ответ → следующий вопрос → результат.
 *
 * Каждый сценарий описывается списком шагов, движок сам показывает вопрос,
 * проверяет ответ, рисует кнопки и в конце вызывает finish с собранными данными.
 *
 * Типы вопросов:
 *
 * | kind    | Что видит человек                       | Как отвечает                 |
 * |---------|-----------------------------------------|------------------------------|
 * | choice  | Кнопки с вариантами                     | Нажимает кнопку              |
 * | yesno   | Кнопки «Да / Нет»                       | Нажимает кнопку              |
 * | number  | Подсказка + пресеты + «пропустить»     | Пишет число или жмёт кнопку  |
 * | text    | Подсказка + «пропустить»                | Пишет текст                  |
 * | multi   | Кнопки-галочки и «Готово»               | Отмечает несколько вариантов |
 *
 * Вопрос можно пропустить условием `when`: например, не спрашивать про рукава
 * у юбки.
 */

import { InlineKeyboard } from "grammy";
import { parseNum } from "./lib/format";
import { esc } from "./lib/html";
import type { Data, MyContext, WizardState } from "./session";

/** Пара «подпись на кнопке» → «значение в ответе». */
export type Opt = [label: string, value: string];

/** Текст вопроса: строка или функция от уже собранных ответов. */
export type StepText = string | ((d: Data) => string);

/** Результат разбора текстового ответа. */
export type ParseResult = { value: unknown } | { error: string };

type Btn = ReturnType<typeof InlineKeyboard.text>;

interface StepBase {
  /** Под каким именем ответ попадёт в data. */
  key: string;
  /** Текст вопроса (HTML). */
  text: StepText;
  /** false → вопрос пропускается. */
  when?: (d: Data) => boolean;
}

export type Step = StepBase &
  (
    | { kind: "choice"; options: Opt[]; cols?: number }
    | { kind: "yesno" }
    | {
        kind: "number";
        min?: number;
        max?: number;
        presets?: number[];
        skip?: { label: string; value: number };
      }
    | {
        kind: "text";
        skip?: { label: string; value: string };
        parse?: (s: string, d: Data) => ParseResult;
      }
    | { kind: "multi"; options: Opt[]; min?: number }
  );

export interface Wizard {
  id: string;
  steps: Step[];
  finish: (ctx: MyContext, data: Data) => Promise<void>;
}

const registry = new Map<string, Wizard>();

/** Регистрирует сценарий: без этого кнопки меню его не запустят. */
export const registerWizard = (w: Wizard): void => {
  registry.set(w.id, w);
};

/** { dress: "Платье" } → [["Платье", "dress"]]. */
export const opts = (labels: Record<string, string>): Opt[] =>
  Object.entries(labels).map(([value, label]) => [label, value]);

/** Текст шага с учётом уже собранных ответов. */
const stepText = (text: StepText, d: Data): string => (typeof text === "function" ? text(d) : text);

/** Режет список на строки по n элементов. */
const chunk = <T>(a: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
};

// ---------- Клавиатуры ----------

function buildKeyboard(step: Step, state: WizardState): InlineKeyboard {
  const rows: Btn[][] = [];
  switch (step.kind) {
    case "choice":
      rows.push(
        ...chunk(
          step.options.map(([l, v]) => InlineKeyboard.text(l, `w:${v}`)),
          step.cols ?? 2
        )
      );
      break;
    case "yesno":
      rows.push([InlineKeyboard.text("Да", "w:y"), InlineKeyboard.text("Нет", "w:n")]);
      break;
    case "number":
      if (step.presets) {
        rows.push(
          ...chunk(
            step.presets.map((n) => InlineKeyboard.text(String(n), `w:${n}`)),
            4
          )
        );
      }
      if (step.skip) rows.push([InlineKeyboard.text(step.skip.label, "w:skip")]);
      break;
    case "text":
      if (step.skip) rows.push([InlineKeyboard.text(step.skip.label, "w:skip")]);
      break;
    case "multi":
      for (const [l, v] of step.options) {
        const on = state.multi.includes(v);
        rows.push([InlineKeyboard.text(`${on ? "✅" : "⬜️"} ${l}`, `m:${v}`)]);
      }
      rows.push([InlineKeyboard.text("Готово ➡️", "m:done")]);
      break;
  }
  rows.push([InlineKeyboard.text("✖️ Отмена", "w:cancel")]);
  return new InlineKeyboard(rows);
}

// ---------- Ход диалога ----------

async function ask(ctx: MyContext, step: Step): Promise<void> {
  const state = ctx.session.wiz;
  if (!state) return;
  state.multi = [];
  const m = await ctx.reply(stepText(step.text, state.data), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: buildKeyboard(step, state),
  });
  state.msgId = m.message_id;
}

/** Переходит к следующему вопросу или завершает диалог. */
async function advance(ctx: MyContext, w: Wizard): Promise<void> {
  const state = ctx.session.wiz;
  if (!state) return;

  // Пропускаем вопросы, для которых не выполнено условие when.
  let step: Step | undefined;
  do {
    state.step += 1;
    step = w.steps[state.step];
  } while (step !== undefined && step.when !== undefined && !step.when(state.data));

  if (!step) {
    const data = state.data;
    delete ctx.session.wiz;
    await w.finish(ctx, data);
    return;
  }
  await ask(ctx, step);
}

/** Запускает сценарий с первого вопроса. */
export async function startWizard(ctx: MyContext, w: Wizard): Promise<void> {
  ctx.session.wiz = { id: w.id, step: -1, data: {}, multi: [] };
  await advance(ctx, w);
}

/** Прерывает диалог. Возвращает true, если диалог был. */
export async function cancelWizard(ctx: MyContext): Promise<boolean> {
  const had = Boolean(ctx.session.wiz);
  delete ctx.session.wiz;
  return had;
}

/** Текущий вопрос диалога. */
function current(ctx: MyContext): { w: Wizard; step: Step; state: WizardState } | undefined {
  const state = ctx.session.wiz;
  if (!state) return undefined;
  const w = registry.get(state.id);
  if (!w) {
    delete ctx.session.wiz;
    return undefined;
  }
  const step = w.steps[state.step];
  if (!step) {
    delete ctx.session.wiz;
    return undefined;
  }
  return { w, step, state };
}

// ---------- Применение ответа ----------

type Applied = { label: string } | { error: string };

function applyNumber(
  step: Extract<Step, { kind: "number" }>,
  state: WizardState,
  raw: string
): Applied {
  const n = parseNum(raw);
  if (n === null) return { error: "Нужно число, например 1500" };
  if (step.min !== undefined && n < step.min) return { error: `Минимум: ${step.min}` };
  if (step.max !== undefined && n > step.max) return { error: `Максимум: ${step.max}` };
  state.data[step.key] = n;
  return { label: String(n) };
}

function applyButton(step: Step, state: WizardState, value: string): Applied {
  switch (step.kind) {
    case "choice": {
      const o = step.options.find(([, v]) => v === value);
      if (!o) return { error: "Нет такого варианта" };
      state.data[step.key] = value;
      return { label: o[0] };
    }
    case "yesno": {
      if (value !== "y" && value !== "n") return { error: "Нет такого варианта" };
      state.data[step.key] = value === "y";
      return { label: value === "y" ? "Да" : "Нет" };
    }
    case "number": {
      if (value === "skip" && step.skip) {
        state.data[step.key] = step.skip.value;
        return { label: step.skip.label };
      }
      return applyNumber(step, state, value);
    }
    case "text": {
      if (value === "skip" && step.skip) {
        state.data[step.key] = step.skip.value;
        return { label: step.skip.label };
      }
      return { error: "Напиши ответ сообщением" };
    }
    default:
      return { error: "Нажми «Готово»" };
  }
}

function applyText(step: Step, state: WizardState, raw: string): Applied {
  switch (step.kind) {
    case "number":
      return applyNumber(step, state, raw);
    case "text": {
      if (step.parse) {
        const r = step.parse(raw, state.data);
        if ("error" in r) return { error: r.error };
        state.data[step.key] = r.value;
        return { label: raw };
      }
      state.data[step.key] = raw;
      return { label: raw };
    }
    default:
      return { error: "Выбери вариант кнопкой выше 👆" };
  }
}

/** Убирает кнопки у уже отвеченного вопроса. */
async function closePrompt(ctx: MyContext, state: WizardState): Promise<void> {
  if (!state.msgId || !ctx.chat) return;
  await ctx.api
    .editMessageReplyMarkup(ctx.chat.id, state.msgId, {
      reply_markup: { inline_keyboard: [] },
    })
    .catch(() => undefined);
}

// ---------- Входящие нажатия и сообщения ----------

/** Возвращает true, если нажатие обработал движок. */
export async function handleWizardCallback(ctx: MyContext): Promise<boolean> {
  const raw = ctx.callbackQuery?.data;
  if (!raw || (!raw.startsWith("w:") && !raw.startsWith("m:"))) return false;

  const cur = current(ctx);
  if (!cur) {
    await ctx.answerCallbackQuery({ text: "Диалог устарел. Начни заново: /start" });
    return true;
  }
  const { w, step, state } = cur;
  const kind = raw[0];
  const value = raw.slice(2);

  if (kind === "w" && value === "cancel") {
    delete ctx.session.wiz;
    await ctx.answerCallbackQuery();
    await closePrompt(ctx, state);
    await ctx.reply("Отменено. Выбери, что посчитать:");
    return true;
  }

  /** Дописывает к вопросу выбранный ответ и убирает кнопки. */
  const confirm = async (label: string): Promise<void> => {
    await ctx
      .editMessageText(`${stepText(step.text, state.data)}\n\n<b>→ ${esc(label)}</b>`, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      })
      .catch(() => undefined);
  };

  // Множественный выбор
  if (kind === "m") {
    if (step.kind !== "multi") {
      await ctx.answerCallbackQuery();
      return true;
    }
    if (value === "done") {
      const min = step.min ?? 0;
      if (state.multi.length < min) {
        await ctx.answerCallbackQuery({
          text: `Выбери хотя бы ${min}`,
          show_alert: true,
        });
        return true;
      }
      // порядок — как в списке вариантов (важно, например, для цен по ширинам)
      const chosen = step.options.filter(([, v]) => state.multi.includes(v));
      state.data[step.key] = chosen.map(([, v]) => v);
      await ctx.answerCallbackQuery();
      await confirm(chosen.map(([l]) => l).join(", ") || "ничего");
      await advance(ctx, w);
      return true;
    }
    if (!step.options.some(([, v]) => v === value)) {
      await ctx.answerCallbackQuery();
      return true;
    }
    state.multi = state.multi.includes(value)
      ? state.multi.filter((v) => v !== value)
      : [...state.multi, value];
    await ctx.answerCallbackQuery();
    await ctx
      .editMessageReplyMarkup({ reply_markup: buildKeyboard(step, state) })
      .catch(() => undefined);
    return true;
  }

  // Обычные кнопки
  const res = applyButton(step, state, value);
  if ("error" in res) {
    await ctx.answerCallbackQuery({ text: res.error, show_alert: true });
    return true;
  }
  await ctx.answerCallbackQuery();
  await confirm(res.label);
  await advance(ctx, w);
  return true;
}

/** Возвращает true, если сообщение было ответом на вопрос диалога. */
export async function handleWizardText(ctx: MyContext): Promise<boolean> {
  const cur = current(ctx);
  if (!cur) return false;
  const { w, step, state } = cur;
  const text = ctx.message?.text?.trim() ?? "";

  const res = applyText(step, state, text);
  if ("error" in res) {
    await ctx.reply(res.error);
    return true;
  }
  await closePrompt(ctx, state);
  await advance(ctx, w);
  return true;
}
