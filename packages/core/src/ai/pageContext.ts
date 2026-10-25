/** Вид записи каталога: страница ткани, шва или проекта. */
export type PageKind = "fabric" | "seam" | "project";

export interface PageRef {
  kind: PageKind;
  slug: string;
}

/**
 * Сегмент маршрута для вида записи.
 *
 * В ссылках вид записи пишется во множественном числе (`/fabrics/...`),
 * а в контексте страницы — в единственном (`fabric/...`). Здесь хранится
 * перевод из второго в первое.
 */
export const ROUTE_SEGMENT: Record<PageKind, string> = {
  fabric: "fabrics",
  seam: "seams",
  project: "projects",
};

/** Строгая форма ссылки на страницу: только латиница, цифры, дефис и подчёркивание. */
const REF = /^(fabric|seam|project)\/([a-z0-9][a-z0-9_-]{0,79})$/;

/**
 * `fabric/cotton-poplin` → ссылка на страницу.
 *
 * Всё остальное — null: неизвестный или подозрительный контекст просто
 * игнорируется, а не ищется в каталоге.
 */
export function parsePageRef(raw: unknown): PageRef | null {
  if (typeof raw !== "string") return null;
  const m = REF.exec(raw.trim());
  return m ? { kind: m[1] as PageKind, slug: m[2] } : null;
}

/**
 * Запись текущей страницы идёт первой, но не вытесняет результаты поиска целиком:
 * в пределах `limit` ей достаётся один слот, остальное — поиску.
 */
export function mergeContext<T extends { slug: string }>(
  pinned: T | null,
  found: readonly T[],
  limit: number
): T[] {
  const rest = found.filter((e) => !pinned || e.slug !== pinned.slug);
  return (pinned ? [pinned, ...rest] : [...rest]).slice(0, Math.max(1, limit));
}

const PREFIX: Record<string, PageKind> = {
  fabrics: "fabric",
  seams: "seam",
  projects: "project",
};

/** `/fabrics/cotton-poplin` → `fabric/cotton-poplin`; любая другая страница → undefined. */
export function ctxFromPath(pathname: string): string | undefined {
  const m = /^\/(fabrics|seams|projects)\/([^/?#]+)\/?$/.exec(pathname);
  if (!m) return undefined;
  const ctx = `${PREFIX[m[1]]}/${decodeURIComponent(m[2])}`;
  return parsePageRef(ctx) ? ctx : undefined;
}
