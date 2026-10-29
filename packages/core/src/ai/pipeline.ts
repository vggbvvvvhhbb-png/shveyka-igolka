/**
 * Конвейер режимов работы помощника.
 *
 * Общий порядок: собрать данные (каталог + интернет), затем попросить модель
 * ответить по ним. Если интернет недоступен, ответ всё равно получается — по
 * каталогу, а в результате это отмечается.
 */

import { chat, modelChain, type ChatTurn, type ModelChain } from "./llm";
import { dedupeSources, exaSearch, ExaError } from "./exa";
import { navigate } from "./navigator";
import { buildSkillMessages, budgetFor, SKILLS, type SkillName } from "./skills";
import { countCitations, parseAnswer } from "./answerFormat";
import type { Source } from "./source";
import type { AnswerMode } from "./modes";

/** Режимы, которые обслуживает конвейер. Режим «Каталог» живёт в /api/chat. */
export type PipelineMode = Exclude<SkillName, never>;

/** Что нужно конвейеру для ответа. */
export type PipelineInput = {
  /** Режим работы. */
  mode: PipelineMode;
  /** Вопрос пользователя. */
  question: string;
  /** Режим ответа: коротко, по шагам или почему. */
  style: AnswerMode | null;
  /** Текст каталога по теме вопроса. */
  catalog: string;
  /** История диалога. */
  history?: ChatTurn[];
};

/** Что можно подменить при вызове конвейера. */
export type PipelineDeps = {
  /** Цепочки моделей. По умолчанию берутся из окружения. */
  models?: {
    fast?: ModelChain;
    reason?: ModelChain;
    navigator?: ModelChain;
  };
};

/** Результат конвейера. */
export type PipelineResult = {
  /** Текст ответа. */
  answer: string;
  /** Источники из интернета. */
  sources: Source[];
  /** Что делал помощник: показывается пользователю как «ход работы». */
  steps: string[];
  /** Модель, которая дала ответ. */
  model: string;
  /** Что не удалось, если не удалось. */
  degraded: string | null;
  /** Вопросы для кнопок под ответом. */
  followUps: string[];
};

/**
 * К чему привязываются запросы.
 *
 * Название машины нужно только вопросам про саму машину. К вопросу про ткани
 * или тренды оно мешает: поиск уходит в обсуждение техники вместо одежды.
 */
const MACHINE_CONTEXT = "Brother LS-200s настройки машины";

/** Признаки вопроса именно про машину. */
const MACHINE_HINT = /машин|ls-?200|игл|стежок|нит|натяжени|лапк|шпульк|обслужив|замен/i;

/** Собирает поисковый запрос из вопроса. */
export function buildQuery(query: string, question: string = ""): string {
  const cleaned = query.replace(/\s+/g, " ").trim();
  if (MACHINE_HINT.test(question)) return `${cleaned} ${MACHINE_CONTEXT}`;
  return `${cleaned} шитьё`;
}

/**
 * Ищет страницы по списку запросов и убирает повторы.
 *
 * Ошибка поиска не роняет режим: возвращается пустой список и пометка,
 * что интернет недоступен.
 */
async function collectSources(
  queries: string[],
  limit: number,
  question: string
): Promise<{ sources: Source[]; degraded: string | null }> {
  const collected: Source[] = [];

  for (const query of queries) {
    try {
      const found = await exaSearch(buildQuery(query, question), { numResults: 5 });
      collected.push(...found);
    } catch (err) {
      if (!(err instanceof ExaError)) throw err;
      console.warn("[pipeline] поиск не удался", { name: err.name });
      return {
        sources: dedupeSources(collected, limit),
        degraded: "Интернет недоступен — ответ только по каталогу",
      };
    }
  }

  return { sources: dedupeSources(collected, limit), degraded: null };
}

/**
 * Прогоняет выбранный режим и возвращает ответ с источниками.
 *
 * Бросает LlmError, если ответ не смогла дать ни одна модель: без ответа
 * показать нечего, и клиент должен узнать об ошибке.
 */
export async function runPipeline(
  input: PipelineInput,
  deps: PipelineDeps = {}
): Promise<PipelineResult> {
  const skill = SKILLS[input.mode];
  const steps: string[] = [];
  const models = deps.models ?? {};
  const fastChain = models.fast ?? modelChain("fast");
  const reasonChain = models.reason ?? modelChain("reason");
  const navigatorChain = models.navigator ?? modelChain("navigator");

  let sources: Source[] = [];
  let degraded: string | null = null;

  if (input.mode === "search") {
    steps.push("Планирую запросы");
    const plan = await navigate(input.question, {
      models: navigatorChain,
      maxQueries: skill.maxQueries,
    });
    steps.push(`Ищу в интернете: ${plan.queries.length}`);
    const found = await collectSources(plan.queries, skill.maxSources, input.question);
    sources = found.sources;
    degraded = found.degraded;
  }

  if (input.mode === "reason") {
    steps.push("Планирую решение");
    const plan = await navigate(input.question, {
      models: navigatorChain,
      maxQueries: skill.maxQueries,
    });
    if (plan.needWeb) {
      steps.push(`Сверяю с интернетом: ${plan.queries.length}`);
      const found = await collectSources(plan.queries, skill.maxSources, input.question);
      sources = found.sources;
      degraded = found.degraded;
    }
  }

  if (input.mode === "research") {
    steps.push("Планирую запросы");
    const plan = await navigate(input.question, {
      models: navigatorChain,
      maxQueries: skill.maxQueries,
    });
    steps.push(`Ищу в интернете: ${plan.queries.length}`);
    const found = await collectSources(plan.queries, skill.maxSources, input.question);
    sources = found.sources;
    degraded = found.degraded;
  }

  steps.push("Собираю ответ");
  const messages = buildSkillMessages(skill, input.question, {
    catalog: input.catalog,
    sources,
    style: input.style,
    history: input.history,
  });

  const chain = skill.modelKind === "fast" ? fastChain : reasonChain;
  const result = await chat({
    models: chain,
    messages,
    temperature: skill.modelKind === "fast" ? 0.3 : 0.2,
    maxTokens: budgetFor(skill, input.style),
    // В коротком ответе размышление не помогает: человек просил одну мысль,
    // и время до ответа важнее его глубины.
    reasoningEffort: input.style === "short" ? undefined : skill.reasoningEffort,
  });

  // Текст приводится к читаемому виду, а блок вопросов выносится отдельно:
  // в интерфейсе он показан кнопками, а не текстом в конце ответа.
  const cleaned = parseAnswer(result.text);

  if (sources.length > 0 && countCitations(cleaned.text) === 0) {
    console.warn("[pipeline] ответ без ссылок на источники", { mode: input.mode });
  }

  return {
    answer: cleaned.text,
    sources,
    steps,
    model: result.model,
    degraded,
    followUps: cleaned.followUps,
  };
}
