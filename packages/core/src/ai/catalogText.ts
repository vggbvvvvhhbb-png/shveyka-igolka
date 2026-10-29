/**
 * Каталог → текст для промта.
 *
 * Режимы «Поиск», «Рассуждение» и «Ресёрч» получают данные каталога не в JSON,
 * а обычным текстом: так их легче читать модели и легче сверять с источниками
 * из интернета. Настройки машины переписываются той же фразой, что и в
 * обычном режиме, — двумя числами у иглы путаться не стоит.
 */

import type { AssistantContext } from "./contextSchema";
import { humanizeMachineSettings } from "./humanize";

/** Список значений через запятую: «хлопок, лён». */
function list(values: readonly string[]): string {
  return values.filter((value) => value.trim().length > 0).join(", ");
}

/** Пара «подпись — значение», если значение есть. */
function pair(label: string, value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? `${label}: ${trimmed}` : null;
}

/**
 * Предложение: с заглавной буквы и с точкой в конце.
 *
 * Блоки текста читаются по-человечески только когда каждый из них
 * заканчивается точкой: иначе «уход: …» прилипает к предыдущему предложению.
 */
function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith(".") ? capitalized : `${capitalized}.`;
}

/**
 * Текст одной ткани.
 *
 * Здесь нет плотности и ширины рулона: в контексте помощника таких полей нет,
 * а выдумывать их нельзя — про состав, вес и растяжимость сказать можно.
 */
function fabricText(fabric: AssistantContext["fabrics"][number]): string {
  const parts = [
    pair("тип", fabric.category),
    pair("вес", fabric.weight_class),
    pair("растяжимость", fabric.stretch),
    pair("подходит для", list(fabric.suitable_for)),
  ].filter((part): part is string => part !== null);

  const tail = [
    humanizeMachineSettings(fabric.default_machine_settings),
    pair("уход", fabric.care_instructions),
    pair("частые проблемы", list(fabric.common_issues)),
  ]
    .filter((part): part is string => Boolean(part))
    .map(sentence)
    .join(" ");

  return tail
    ? `- ${fabric.name}: ${parts.join("; ")}. ${tail}`
    : `- ${fabric.name}: ${parts.join("; ")}.`;
}

/** Текст одного шва: когда применяется, настройки и типичные ошибки. */
function seamText(seam: AssistantContext["seams"][number]): string {
  const parts = [
    pair("тип", seam.type),
    pair("сложность", seam.difficulty),
    pair("подходит для", list(seam.suitable_weight_classes)),
    pair("когда применять", seam.when_to_use),
  ].filter((part): part is string => part !== null);

  const steps = seam.steps
    .slice(0, 6)
    .map((step) => `${step.order}. ${step.instruction}`)
    .join("; ");

  const tail = [
    humanizeMachineSettings(seam.default_machine_settings),
    steps ? `порядок работы: ${steps}` : "",
    pair("типичные ошибки", list(seam.common_mistakes)),
  ]
    .filter((part): part is string => Boolean(part))
    .map(sentence)
    .join(" ");

  return tail
    ? `- ${seam.name}: ${parts.join("; ")}. ${tail}`
    : `- ${seam.name}: ${parts.join("; ")}.`;
}

/** Текст одного проекта: расход ткани, швы и список проверки. */
function projectText(project: AssistantContext["projects"][number]): string {
  const [from, to] = project.estimated_time_hours;
  const parts = [
    pair("тип изделия", project.garment_type),
    pair("сложность", project.difficulty),
    pair("время работы", `${from}–${to} ч`),
    pair("расход ткани", project.fabric_amount_formula),
    pair("нужные швы", list(project.required_seams)),
  ].filter((part): part is string => part !== null);

  const tail = [
    pair("подсказка по размеру", project.size_hint ?? ""),
    pair("проверить в конце", list(project.final_checklist)),
  ]
    .filter((part): part is string => part !== null)
    .map(sentence)
    .join(" ");

  return tail
    ? `- ${project.name}: ${parts.join("; ")}. ${tail}`
    : `- ${project.name}: ${parts.join("; ")}.`;
}

/**
 * Собирает текст каталога для промта.
 *
 * Пустой каталог даёт пустую строку: тогда модель честно скажет, что данных
 * по теме нет, вместо того чтобы додумать.
 */
export function buildCatalogText(context: AssistantContext): string {
  const blocks: string[] = [];

  if (context.fabrics.length > 0) {
    blocks.push(`Ткани:\n${context.fabrics.map(fabricText).join("\n")}`);
  }
  if (context.seams.length > 0) {
    blocks.push(`Швы:\n${context.seams.map(seamText).join("\n")}`);
  }
  if (context.projects.length > 0) {
    blocks.push(`Проекты:\n${context.projects.map(projectText).join("\n")}`);
  }

  return blocks.join("\n\n");
}
