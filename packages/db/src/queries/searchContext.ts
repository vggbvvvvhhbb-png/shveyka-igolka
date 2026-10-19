import type { DatabaseClient } from "../client";
import type { AssistantContext } from "@shveyka/core";
import { AssistantContextSchema } from "@shveyka/core";
import { searchFabrics, findFabricsByAliases } from "./fabrics";
import { listSeams } from "./seams";
import { listProjects } from "./projects";
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
]);

const MAX_PER_KIND = 8;
const MAX_FABRICS = 4;

/**
 * Извлекает значимые слова запроса: нижний регистр, без коротких и стоп-слов.
 */
export function extractKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/iu)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  // Грубая основа: отбрасываем последнюю букву у длинных слов,
  // чтобы падежные формы («джинсы», «джинсу») находили «Джинса».
  const stems = words.filter((w) => w.length > 4).map((w) => w.slice(0, -1));

  return [...new Set([...words, ...stems])];
}

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/**
 * Ищет релевантные записи каталога для вопроса пользователя.
 * Ткани — через searchFabrics по ключевым словам.
 * Швы и проекты — фильтрация в JS по name и aliases/steps (объёмы каталога малы).
 */
export async function searchContext(db: DatabaseClient, query: string): Promise<AssistantContext> {
  const keywords = extractKeywords(query);

  if (keywords.length === 0) {
    return { fabrics: [], seams: [], projects: [] };
  }

  const fabricRows = await withRetry(async () => {
    const found: Awaited<ReturnType<typeof searchFabrics>> = [];
    const seen = new Set<string>();
    for (const word of keywords) {
      const rows = await searchFabrics(db, { q: word });
      for (const row of rows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          found.push(row);
        }
      }
      if (found.length >= MAX_FABRICS) break;
    }

    // Алиасы: ищем по словам запроса (нижний регистр) и их основам,
    // совпадения по name дедуплицируются по id. Приоритет — у searchFabrics.
    if (found.length < MAX_FABRICS) {
      const aliasWords = [...new Set(keywords)];
      for (const word of aliasWords) {
        const aliasRows = await findFabricsByAliases(db, word);
        for (const row of aliasRows) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            found.push(row);
          }
        }
        if (found.length >= MAX_FABRICS) break;
      }
    }

    return found.slice(0, MAX_FABRICS);
  });

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
    projects: projectRows.map((p) => ({
      slug: p.id,
      name: p.name,
      category: p.category,
      garment_type: p.garment_type,
      difficulty: p.difficulty,
      estimated_time_hours: p.estimated_time_hours as [number, number],
      fabric_amount_formula: p.fabric_amount_formula,
      required_seams: p.required_seams as string[],
      final_checklist: p.final_checklist as string[],
    })),
  };

  return AssistantContextSchema.parse(context);
}
