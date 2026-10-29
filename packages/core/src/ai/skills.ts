/**
 * Навыки режимов работы помощника.
 *
 * Каждый режим отличается источником данных и моделью: «Поиск» берёт одну
 * выдачу интернета и отвечает быстро, «Рассуждение» разбирает задачу по шагам,
 * «Ресёрч» делает несколько запросов и собирает отчёт.
 */

import { modeInstruction, type AnswerMode } from "./modes";
import type { ChatTurn } from "./llm";
import type { Source } from "./source";

/** Навыки, работающие с интернетом. */
export type SkillName = "search" | "reason" | "research";

/** Описание навыка. */
export type Skill = {
  name: SkillName;
  /** Подпись в интерфейсе. */
  label: string;
  /** Какая цепочка моделей используется. */
  modelKind: "fast" | "reason";
  /** Сколько запросов в интернет делать. */
  maxQueries: number;
  /** Сколько источников показывать в ответе. */
  maxSources: number;
  /** Сколько символов текста источника уходит в промт. */
  snippetLimit: number;
  /** Инструкция режима для модели. */
  instruction: string;
};

/**
 * Общая часть промта: кто отвечает и что нельзя.
 *
 * Каталог — источник истины о машине: настройки, размеры и режимы берутся
 * только из него. Интернет дополняет, но не переписывает.
 */
export const ASSISTANT_PERSONA = [
  "Ты — помощник проекта «Швейка»: справочник по швейной машине Brother LS-200s для домашних швей.",
  "Отвечай по-русски, спокойно и конкретно, без снисходительности и без жаргона.",
  "Настройки машины (игла, нить, стежок, натяжение, лапка) бери только из каталога.",
  "Если в каталоге нужного нет — скажи это прямо и предложи, как проверить.",
  "Никогда не выдумывай значения: неизвестное значение хуже прямого «не знаю».",
].join("\n");

/** Общие правила для режимов с интернетом. */
const WEB_RULES = [
  "Интернет — дополнение к каталогу, а не замена ему.",
  "После утверждения из интернета ставь ссылку в квадратных скобках: [1], [2].",
  "Ссылки в скобках соответствуют списку источников в конце подсказки.",
  "Если источники не подтверждают утверждение, не выдавай его за факт.",
].join("\n");

/** Навыки режимов. */
export const SKILLS: Record<SkillName, Skill> = {
  search: {
    name: "search",
    label: "Поиск",
    modelKind: "fast",
    maxQueries: 1,
    maxSources: 5,
    snippetLimit: 320,
    instruction: [
      "Режим «Поиск»: найди в интернете, как решается задача, и сверь с каталогом.",
      "Ответь по-русски в 3–6 предложениях или коротким списком.",
      WEB_RULES,
    ].join("\n"),
  },
  reason: {
    name: "reason",
    label: "Рассуждение",
    modelKind: "reason",
    maxQueries: 2,
    maxSources: 5,
    snippetLimit: 420,
    instruction: [
      "Режим «Рассуждение»: разбери задачу по шагам и только потом дай ответ.",
      "Структура ответа: «Итог» — одно предложение, «Ход решения» — нумерованные шаги, «Нюансы» — на что обратить внимание.",
      "Если шаг требует проверки в интернете, опирайся на источники и пометь их ссылками.",
      WEB_RULES,
    ].join("\n"),
  },
  research: {
    name: "research",
    label: "Ресёрч",
    modelKind: "reason",
    maxQueries: 3,
    maxSources: 8,
    snippetLimit: 480,
    instruction: [
      "Режим «Ресёрч»: собери отчёт по нескольким источникам.",
      "Структура ответа: «Короткий вывод» — 2–3 предложения, «Что нашли» — по пунктам с ссылками, «Что осталось неизвестным» — если что-то не подтвердилось.",
      "Не повторяй одно и то же из разных источников.",
      WEB_RULES,
    ].join("\n"),
  },
};

/** Данные для промта. */
export type SkillContext = {
  /** Текст каталога: записи, найденные по вопросу. */
  catalog: string;
  /** Найденные страницы. */
  sources: Source[];
  /** Режим ответа: коротко, по шагам или почему. */
  style: AnswerMode | null;
  /** История диалога. */
  history?: ChatTurn[];
};

/**
 * Собирает текст источников для промта.
 *
 * Нумерация в квадратных скобках совпадает с тем, что показывается в
 * интерфейсе: [1] — первая ссылка, [2] — вторая.
 */
export function buildSourcesBlock(sources: Source[], snippetLimit: number): string {
  if (sources.length === 0) return "";
  const lines = sources.map((source, index) => {
    const snippet = source.snippet.slice(0, snippetLimit);
    const date = source.date ? ` (${source.date})` : "";
    return `[${index + 1}] ${source.title}${date}\n${source.url}\n${snippet}`;
  });
  return `Источники:\n${lines.join("\n\n")}`;
}

/**
 * Собирает сообщения для модели.
 *
 * Системное сообщение описывает роль и правила, пользовательское — сам
 * вопрос и выбранный режим ответа.
 */
export function buildSkillMessages(
  skill: Skill,
  question: string,
  context: SkillContext
): ChatTurn[] {
  const blocks = [ASSISTANT_PERSONA, skill.instruction];

  if (context.catalog.trim()) {
    blocks.push(`Данные каталога:\n${context.catalog.trim()}`);
  }

  const sourcesBlock = buildSourcesBlock(context.sources, skill.snippetLimit);
  if (sourcesBlock) {
    blocks.push(sourcesBlock);
  }

  const style = modeInstruction(context.style);
  if (style) blocks.push(style);

  const history = context.history ?? [];
  const messages: ChatTurn[] = [{ role: "system", content: blocks.join("\n\n") }];
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: "user", content: question });

  return messages;
}
