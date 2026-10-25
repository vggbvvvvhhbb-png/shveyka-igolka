import type { AssistantContext } from "./contextSchema";
import { hasMeasurements } from "./measurements";
import { humanizeMachineSettings } from "./humanize";
import { SOFT_REFUSAL_RULE } from "./fallback";

const INSTRUCTIONS = `Ты — консультант по шитью Швейка. Помогаешь с тканями, швами, проектами и настройками швейной машины Brother LS-200s.

Правила:
1. Отвечай только по данным из блока «Доступные данные». Не используй знания из других источников для параметров машины и свойств тканей.
2. ${SOFT_REFUSAL_RULE}
3. Не придумывай настройки машины (игла, стежок, натяжение) для тканей, которых нет в блоке.
4. Ссылайся на записи в формате markdown: [название](/fabrics/slug), [название](/seams/slug), [название](/projects/slug).
5. Отвечай по-русски. Обычно 3–8 предложений. Для пошаговых инструкций используй нумерованный список.
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

export function buildSystemPrompt(context: AssistantContext): string {
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

  return `${instructions}

## Доступные данные
${dataBlock}${settingsBlock}`;
}
