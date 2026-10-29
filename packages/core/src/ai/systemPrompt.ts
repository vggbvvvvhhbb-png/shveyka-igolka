import type { AssistantContext } from "./contextSchema";
import { hasMeasurements } from "./measurements";
import { humanizeMachineSettings } from "./humanize";
import { SOFT_REFUSAL_RULE } from "./fallback";
import { FORMAT_RULES, FOLLOW_UP_RULES } from "./answerFormat";
import type { AnswerMode } from "./modes";

const INSTRUCTIONS = `Ты — консультант по шитью Швейка. Помогаешь с тканями, швами, проектами и настройками швейной машины Brother LS-200s.

Правила:
1. Отвечай только по данным из блока «Доступные данные». Не используй знания из других источников для параметров машины и свойств тканей.
2. ${SOFT_REFUSAL_RULE}
3. Не придумывай настройки машины (игла, стежок, натяжение) для тканей, которых нет в блоке.
4. Ссылайся на записи в формате markdown: [название](/fabrics/slug), [название](/seams/slug), [название](/projects/slug).
5. Отвечай по-русски. Для пошаговых инструкций используй нумерованный список.
6. Если вопрос не про шитьё, вежливо откажись и предложи вопрос по теме каталога.`;

/**
 * Дополнительные правила, когда у пользователя заполнены мерки.
 *
 * Пояснение про формулу нужно, потому что в каталоге fabric_amount_formula
 * считает длину отреза в сантиметрах, а width, length и sleeve_length в ней —
 * это размеры самого изделия, а не ширина ткани. Без пояснения модель
 * склонна считать, что речь про ширину полотна.
 */
const MEASUREMENT_INSTRUCTIONS = `7. В блоке «Мерки» указаны размеры пользователя в сантиметрах. Учитывай их при подборе проекта и при расчёте расхода ткани. Формула проекта в fabric_amount_formula даёт длину отреза в сантиметрах, где width, length и sleeve_length — это размеры самого изделия, а не ширина ткани. Если размер из мерок вывести нельзя, скажи об этом прямо и возьми расход из materials.main_fabric. Если у проекта есть size_hint — это уже посчитанный размер, используй его.`;

/**
 * Структура развёрнутого ответа по каталогу.
 *
 * Без неё модель пишет три общих предложения: человек спрашивает про
 * иглу для джинсы, а получает «используйте иглу 90/14». С разделами ответ
 * становится пошаговым: что взять, что настроить, на что смотреть.
 */
const CATALOG_STRUCTURE = [
  "Структура ответа:",
  "- ## Короткий ответ — 2–4 предложения: ответ по сути;",
  "- ## Что делать — 2–4 конкретных шага, что настроить или сделать;",
  "- ## Нюансы — 2–4 пункта, на что обратить внимание.",
  "Называй конкретику из каталога: ткань и её плотность, номер иглы, нить, строчку, лапку.",
].join("\n");

/**
 * Структура ответа в режиме «Почему».
 *
 * Отдельная, потому что там важно не «что делать», а «почему именно так»:
 * человек уже выбрал ткань и спрашивает обоснование.
 */
const CATALOG_WHY_STRUCTURE = [
  "Структура ответа:",
  "- ## Ответ — 2–3 предложения: что рекомендуется;",
  "- ## Почему так — 3–5 пунктов: почему именно эти настройки и эта ткань;",
  "- ## Что делать — 2–3 конкретных шага.",
  "Называй конкретику из каталога: ткань и её плотность, номер иглы, нить, строчку, лапку.",
].join("\n");

/**
 * Настройки машины теми же словами, что и в каталоге.
 *
 * Рядом с сырым JSON: JSON остаётся источником истины, а фраза помогает
 * модели не перепутать метрический и американский размер иглы.
 */
function humanizedSettings(context: AssistantContext): string[] {
  const lines: string[] = [];

  for (const f of context.fabrics) {
    const text = humanizeMachineSettings(f.default_machine_settings);
    if (text) lines.push(`${f.name}: ${text}`);
  }
  for (const s of context.seams) {
    const text = humanizeMachineSettings(s.default_machine_settings);
    if (text) lines.push(`${s.name}: ${text}`);
  }

  return lines;
}

/**
 * Промт каталожного режима.
 *
 * mode — выбранный режим ответа. Он решает, каким будет ответ: «Коротко»
 * остаётся коротким, остальные получают разделы и вопросы для кнопок.
 */
export function buildSystemPrompt(
  context: AssistantContext,
  mode: AnswerMode | null = null
): string {
  // Мерки тоже считаются данными: без них блок остался бы пустым, и модель
  // не увидела бы размеры пользователя, даже если каталог ничего не нашёл.
  const hasData =
    context.fabrics.length > 0 ||
    context.seams.length > 0 ||
    context.projects.length > 0 ||
    hasMeasurements(context.measurements);

  const dataBlock = hasData
    ? JSON.stringify(context, null, 2)
    : "Подходящих записей не найдено. Блок данных пуст.";

  // Без мерок промпт остаётся ровно таким же, как был до их появления.
  const instructions = hasMeasurements(context.measurements)
    ? `${INSTRUCTIONS}\n${MEASUREMENT_INSTRUCTIONS}`
    : INSTRUCTIONS;

  const settings = humanizedSettings(context);
  const settingsBlock =
    settings.length > 0 ? `\n\n## Настройки машины словами\n${settings.join("\n")}` : "";

  return `${[instructions, ...answerRules(mode)].join("\n\n")}

## Доступные данные
${dataBlock}${settingsBlock}`;
}

/**
 * Правила оформления ответа под выбранный режим.
 *
 * В режиме «Коротко» правил нет: человек попросил короткий ответ, и требовать
 * разделы и вопросы — значит заставлять модель спорить с режимом.
 */
function answerRules(mode: AnswerMode | null): string[] {
  if (mode === "short") return [];

  const rules = [FORMAT_RULES];

  if (mode === "why") rules.push(CATALOG_WHY_STRUCTURE);
  else if (mode !== "steps") rules.push(CATALOG_STRUCTURE);

  rules.push(FOLLOW_UP_RULES);
  return rules;
}
