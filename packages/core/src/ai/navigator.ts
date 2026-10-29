/**
 * Планировщик поиска.
 *
 * Перед поиском модель раскладывает вопрос на запросы. Если модель ответила
 * не JSON или не ответила вовсе, план собирается эвристически: вопрос сам
 * становится запросом. Тогда режим всё равно работает, просто ищет хуже.
 */

import { z } from "zod";
import { chat, modelChain, type ChatTurn, type ModelChain } from "./llm";

/** План поиска: запросы и признак того, нужен ли интернет. */
export type Plan = {
  /** Основные поисковые запросы. */
  queries: string[];
  /** Уточняющие запросы. */
  subqueries: string[];
  /** Нужен ли интернет для ответа. */
  needWeb: boolean;
};

const PlanSchema = z.object({
  queries: z.array(z.string().trim().min(1)).min(1).max(5),
  subqueries: z.array(z.string().trim().min(1)).max(5).default([]),
  needWeb: z.boolean().default(true),
});

const NAVIGATOR_SYSTEM = [
  "Ты — планировщик поиска для помощника по швейной машине Brother LS-200s.",
  "Разбей вопрос на 1–3 поисковых запроса и уточняющие подзапросы.",
  'Ответь ТОЛЬКО JSON без пояснений: {"queries":["..."],"subqueries":["..."],"needWeb":true}',
  "queries — запросы, которые вводят в поисковую строку, по-русски, без кавычек.",
  "needWeb — true, если для ответа нужны данные из интернета, false — если хватит каталога.",
].join("\n");

/** Параметры планировщика. */
export type NavigateOptions = {
  /** Цепочка моделей. По умолчанию берётся из окружения. */
  models?: ModelChain;
  /** Сколько запросов оставить. */
  maxQueries?: number;
  /** Таймаут планирования. */
  timeoutMs?: number;
};

/**
 * Убирает из вопроса служебные слова, чтобы он годился поисковой строке.
 */
function cleanQuestion(question: string): string {
  return question
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "")
    .replace(/^(как|что|почему|какой|какая|какие|где|когда|зачем|нужно ли)\s+/i, "")
    .trim();
}

/**
 * План без модели: вопрос становится запросом.
 *
 * Используется, когда модель ответила не JSON или не ответила вовсе.
 */
export function heuristicPlan(question: string): Plan {
  const cleaned = cleanQuestion(question);
  const parts = cleaned
    .split(/\s+(?:и|или)\s+|,\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 3);

  const queries = parts.length > 0 ? parts : [cleaned || question];

  return {
    queries,
    subqueries: [],
    needWeb: true,
  };
}

/**
 * Разбирает ответ модели в план.
 *
 * Модель часто оборачивает JSON в пояснение или в блок кода — такое
 * вырезается. Если разобрать не удалось, план собирается эвристически.
 */
export function parsePlan(text: string, fallbackQuestion = ""): Plan {
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = PlanSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
      if (parsed.success) {
        return {
          queries: parsed.data.queries.map((query) => cleanQuestion(query) || query),
          subqueries: parsed.data.subqueries,
          needWeb: parsed.data.needWeb,
        };
      }
    } catch {
      /* JSON не разобрался — ниже эвристика */
    }
  }

  return heuristicPlan(fallbackQuestion || text);
}

/**
 * Строит план поиска.
 *
 * Ошибка модели не считается ошибкой режима: план собирается эвристически.
 */
export async function navigate(question: string, options: NavigateOptions = {}): Promise<Plan> {
  const models = options.models ?? modelChain("navigator");
  const messages: ChatTurn[] = [
    { role: "system", content: NAVIGATOR_SYSTEM },
    { role: "user", content: question },
  ];

  try {
    const result = await chat({
      models,
      messages,
      temperature: 0,
      maxTokens: 400,
      timeoutMs: options.timeoutMs ?? 20_000,
    });
    const plan = parsePlan(result.text, question);
    const maxQueries = options.maxQueries ?? 3;
    return { ...plan, queries: plan.queries.slice(0, maxQueries) };
  } catch (err) {
    console.warn("[navigator] план собран без модели", {
      name: err instanceof Error ? err.name : "unknown",
    });
    const plan = heuristicPlan(question);
    const maxQueries = options.maxQueries ?? 3;
    return { ...plan, queries: plan.queries.slice(0, maxQueries) };
  }
}
