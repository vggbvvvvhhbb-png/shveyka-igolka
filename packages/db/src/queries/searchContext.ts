import type { DatabaseClient } from "../client";
import type { AssistantContext, BodyMeasurements } from "@shveyka/core";
import {
  AssistantContextSchema,
  buildSizeHint,
  hasMeasurements,
  matchesSearchTerm,
  normalizeSearchText,
  rankByTier,
} from "@shveyka/core";
import { searchFabricsByKeywords } from "./fabrics";
import { listSeams } from "./seams";
import { listProjects } from "./projects";
import { getMeasurements } from "./measurements";
import { withRetry } from "../utils/withRetry";

const STOP_WORDS = new Set([
  "что",
  "как",
  "какой",
  "какую",
  "какие",
  "где",
  "для",
  "про",
  "или",
  "это",
  "мне",
  "взять",
  "есть",
  "нужно",
  "можно",
  // Общие слова ничего не различают в каталоге, а место в контексте занимают.
  // «Ткань» совпадало с названиями «Костюмная стрейч-ткань» и «Подкладочная
  // ткань»: в контекст попадали ткани, о которых не спрашивали.
  "ткань",
  "материал",
  "изделие",
  "вещь",
]);

const MAX_PER_KIND = 8;
const MAX_FABRICS = 4;

/**
 * Сколько кандидатов берём из базы, прежде чем отобрать лучшие.
 *
 * Запрос может совпасть с несколькими тканями по-разному: «Лён» назван прямо,
 * а «Хлопок-стрейч» упомянут в тексте ухода. В контекст должны попасть те,
 * что названы прямо, поэтому берём с запасом и отбираем сами.
 */
const FABRIC_CANDIDATES = 12;

/**
 * Извлекает значимые слова запроса: нижний регистр, без коротких и стоп-слов.
 *
 * Слова приводятся к общему виду: «ё» становится «е», поэтому запрос «из льна»
 * и запись «Лён» сравнимы. Падежные формы («льня», «льна») находятся по
 * «скелету» слова — см. matchesSearchTerm.
 */
export function extractKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/iu)
    .map((w) => normalizeSearchText(w))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  // Грубая основа: отбрасываем последнюю букву у длинных слов,
  // чтобы падежные формы («джинсы», «джинсу») находили «Джинса».
  const stems = words.filter((w) => w.length > 4).map((w) => w.slice(0, -1));

  return [...new Set([...words, ...stems])];
}

/**
 * Проверяет, совпадает ли текст каталога хотя бы с одним словом запроса.
 *
 * Сравнение учитывает нормализацию текста и падежные формы: «льня» находит
 * «Лён», «кулирка» — «Трикотаж кулирная гладь».
 */
function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => matchesSearchTerm(text, keyword));
}

/**
 * Читает мерки пользователя и приводит их к виду, удобному для контекста.
 * Если мерок нет или все поля пустые, возвращается undefined — тогда блок
 * «Мерки» в промпте не появляется вовсе.
 */
async function loadMeasurements(db: DatabaseClient): Promise<BodyMeasurements | undefined> {
  const row = await withRetry(() => getMeasurements(db));
  if (!row) return undefined;

  const measurements: BodyMeasurements = {
    bust: row.bust ?? undefined,
    waist: row.waist ?? undefined,
    hip: row.hip ?? undefined,
    height: row.height ?? undefined,
  };
  return hasMeasurements(measurements) ? measurements : undefined;
}

/**
 * Ищет релевантные записи каталога для вопроса пользователя.
 * Ткани — через searchFabricsByKeywords по ключевым словам.
 * Швы и проекты — фильтрация в JS по name и aliases/steps (объёмы каталога малы).
 */
export async function searchContext(db: DatabaseClient, query: string): Promise<AssistantContext> {
  const keywords = extractKeywords(query);
  const measurements = await loadMeasurements(db);

  if (keywords.length === 0) {
    return { fabrics: [], seams: [], projects: [] };
  }

  // Ткани — один запрос по всем ключевым словам сразу. Совпадение по названию
  // приоритетнее совпадения по алиасу или составу, дедупликация — по id.
  const fabricCandidates = await withRetry(() =>
    searchFabricsByKeywords(db, keywords, FABRIC_CANDIDATES)
  );

  // Среди найденных первыми идут записи, названные прямо, — только они
  // отвечают на вопрос. Совпадения по составу и по свободным текстам — ниже.
  const fabricRows = rankByTier(fabricCandidates, keywords, (fabric) => ({
    name: fabric.name,
    aliases: fabric.aliases as string[],
    composition: fabric.composition,
    care: fabric.care_instructions,
    issues: fabric.common_issues as string[],
  })).slice(0, MAX_FABRICS);

  const allSeams = await listSeams(db);
  const seamRows = allSeams
    .filter(
      (s) =>
        matchesAny(s.name, keywords) || (s.aliases as string[]).some((a) => matchesAny(a, keywords))
    )
    .slice(0, MAX_PER_KIND);

  const allProjects = await listProjects(db);
  const projectRows = allProjects
    .filter((p) => matchesAny(p.name, keywords))
    .slice(0, MAX_PER_KIND);

  const context = {
    fabrics: fabricRows.map((f) => ({
      slug: f.id,
      name: f.name,
      aliases: f.aliases as string[],
      category: f.category,
      weight_class: f.weight_class,
      stretch: f.stretch,
      suitable_for: f.suitable_for as string[],
      default_machine_settings: f.default_machine_settings as Record<string, unknown>,
      care_instructions: f.care_instructions,
      common_issues: f.common_issues as string[],
    })),
    seams: seamRows.map((s) => ({
      slug: s.id,
      name: s.name,
      aliases: s.aliases as string[],
      type: s.type,
      difficulty: s.difficulty,
      suitable_weight_classes: s.suitable_weight_classes as string[],
      when_to_use: s.when_to_use,
      default_machine_settings: s.default_machine_settings as Record<string, unknown>,
      steps: (s.steps as Array<{ order: number; instruction: string; tip?: string }>).map((st) => ({
        order: st.order,
        instruction: st.instruction,
        ...(st.tip ? { tip: st.tip } : {}),
      })),
      common_mistakes: s.common_mistakes as string[],
    })),
    projects: projectRows.map((p) => {
      // Подсказка по размеру появляется, только если мерки есть и для этого
      // типа изделия есть правило вывода размера.
      const sizeHint = measurements ? buildSizeHint(p.garment_type, measurements) : null;
      return {
        slug: p.id,
        name: p.name,
        category: p.category,
        garment_type: p.garment_type,
        difficulty: p.difficulty,
        estimated_time_hours: p.estimated_time_hours as [number, number],
        fabric_amount_formula: p.fabric_amount_formula,
        required_seams: p.required_seams as string[],
        final_checklist: p.final_checklist as string[],
        ...(sizeHint ? { size_hint: sizeHint } : {}),
      };
    }),
    ...(measurements ? { measurements } : {}),
  };

  return AssistantContextSchema.parse(context);
}
