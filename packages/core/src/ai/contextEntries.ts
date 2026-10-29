import { MAX_CONTEXT_SLUGS_LENGTH } from "./constants";
import type { AssistantContext, FabricContext, ProjectContext, SeamContext } from "./contextSchema";
import { hasMeasurements, type BodyMeasurements } from "./measurements";
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

/**
 * Мерки из сгруппированного контекста.
 *
 * Мерки — не запись каталога: у них нет страницы и слага, поэтому в плоский
 * список они не попадают. Их нужно доставать отдельно, иначе при обратной
 * сборке контекста они молча теряются: промт остаётся без размеров
 * пользователя, а ответ с мерками считается общим и попадает в кэш.
 */
export function measurementsOf(ctx: AssistantContext): BodyMeasurements | undefined {
  return hasMeasurements(ctx.measurements) ? ctx.measurements : undefined;
}

/**
 * Собирает обратно сгруппированный контекст — он нужен блоку данных промта.
 *
 * Мерки передаются отдельным аргументом: в плоском списке записей их нет,
 * и без них блок данных остался бы без размеров пользователя.
 */
export function groupContext(
  entries: readonly ContextEntry[],
  measurements?: BodyMeasurements
): AssistantContext {
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
    ...(hasMeasurements(measurements) ? { measurements } : {}),
  };
}

/**
 * Записи контекста в формате «тип/slug» — по одной на запись.
 *
 * Тот же формат, что у заголовка X-Context-Slugs, но списком: он сохраняется
 * вместе с сообщением в базе, чтобы в открытом заново диалоге ссылки на
 * каталог снова стали кликабельными.
 */
export function collectContextSlugs(entries: readonly ContextEntry[]): string[] {
  return entries.map((e) => `${ROUTE_SEGMENT[e.kind]}/${e.slug}`);
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
  for (const item of collectContextSlugs(entries)) {
    const next = result ? `${result},${item}` : item;
    if (next.length > maxLength) break;
    result = next;
  }
  return result;
}

/**
 * Записи контекста как ссылки для интерфейса: подпись и адрес страницы.
 *
 * Интерфейс показывает их карточками под ответом: из ответа про ткань
 * можно сразу перейти на страницу этой ткани в каталоге.
 */
export function collectRelatedLinks(
  entries: readonly ContextEntry[]
): { label: string; href: string }[] {
  return entries.map((entry) => ({
    label: entry.name,
    href: `/${ROUTE_SEGMENT[entry.kind]}/${entry.slug}`,
  }));
}

/**
 * Разбирает заголовок X-Context-Related обратно в список карточек.
 *
 * Заголовок приходит в escape-виде: в названиях записей есть русские буквы,
 * а байтовая строка HTTP-заголовка их не вмещает.
 *
 * Заголовок приходит с сервера, поэтому содержимое может оказаться любым:
 * пустым, обрезанным или вовсе не тем, что ожидалось. Битый заголовок не
 * должен ломать ответ — в этом случае карточек просто не будет.
 */
export function parseRelatedLinks(raw: string | null): { label: string; href: string }[] {
  if (!raw) return [];

  let json: string;
  try {
    json = decodeURIComponent(raw);
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const links: { label: string; href: string }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const { label, href } = item as { label?: unknown; href?: unknown };
    if (typeof label !== "string" || typeof href !== "string") continue;
    // Адрес ведёт внутрь сайта: никакие внешние ссылки карточками не бывают.
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    links.push({ label, href });
  }

  return links;
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
