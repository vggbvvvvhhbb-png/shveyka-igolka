import { MAX_CONTEXT_SLUGS_LENGTH } from "./constants";
import type { AssistantContext, FabricContext, ProjectContext, SeamContext } from "./contextSchema";
import { ROUTE_SEGMENT, type PageKind } from "./pageContext";

/**
 * Запись каталога в плоском виде.
 *
 * Плоский список — общая валюта контекста: из него строится и блок данных
 * для промта, и заголовок X-Context-Slugs. Поэтому страница, которой нет
 * в контексте, в ссылках ответа появиться не может.
 */
export type ContextEntry =
  | { kind: "fabric"; slug: string; name: string; data: FabricContext }
  | { kind: "seam"; slug: string; name: string; data: SeamContext }
  | { kind: "project"; slug: string; name: string; data: ProjectContext };

/**
 * Раскладывает сгруппированный контекст в плоский список.
 *
 * Записи перемежаются по видам (ткань, шов, проект, ткань, шов, проект…),
 * иначе шесть записей контекста целиком заняли бы ткани — швы и проекты
 * до ответа не дошли бы.
 */
export function flattenContext(ctx: AssistantContext): ContextEntry[] {
  const fabrics: ContextEntry[] = ctx.fabrics.map((data) => ({
    kind: "fabric",
    slug: data.slug,
    name: data.name,
    data,
  }));
  const seams: ContextEntry[] = ctx.seams.map((data) => ({
    kind: "seam",
    slug: data.slug,
    name: data.name,
    data,
  }));
  const projects: ContextEntry[] = ctx.projects.map((data) => ({
    kind: "project",
    slug: data.slug,
    name: data.name,
    data,
  }));

  const out: ContextEntry[] = [];
  const depth = Math.max(fabrics.length, seams.length, projects.length);
  for (let i = 0; i < depth; i++) {
    if (fabrics[i]) out.push(fabrics[i]);
    if (seams[i]) out.push(seams[i]);
    if (projects[i]) out.push(projects[i]);
  }
  return out;
}

/** Собирает обратно сгруппированный контекст — он нужен блоку данных промта. */
export function groupContext(entries: readonly ContextEntry[]): AssistantContext {
  return {
    fabrics: entries
      .filter((e): e is Extract<ContextEntry, { kind: "fabric" }> => e.kind === "fabric")
      .map((e) => e.data),
    seams: entries
      .filter((e): e is Extract<ContextEntry, { kind: "seam" }> => e.kind === "seam")
      .map((e) => e.data),
    projects: entries
      .filter((e): e is Extract<ContextEntry, { kind: "project" }> => e.kind === "project")
      .map((e) => e.data),
  };
}

/**
 * Список разрешённых ссылок в формате «тип/slug» для заголовка
 * X-Context-Slugs: ровно те записи, что попали в контекст ответа.
 */
export function buildContextSlugsHeader(
  entries: readonly ContextEntry[],
  maxLength = MAX_CONTEXT_SLUGS_LENGTH
): string {
  let result = "";
  for (const e of entries) {
    const item = `${ROUTE_SEGMENT[e.kind]}/${e.slug}`;
    const next = result ? `${result},${item}` : item;
    if (next.length > maxLength) break;
    result = next;
  }
  return result;
}

/** Вид записи по сегменту маршрута — для поиска по странице. */
export const kindOfSegment = (segment: string): PageKind | null =>
  segment === "fabrics"
    ? "fabric"
    : segment === "seams"
      ? "seam"
      : segment === "projects"
        ? "project"
        : null;
