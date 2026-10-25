import { str, strList, type Row } from "./normalize";

/** Ссылка на запись каталога. Ссылки строятся только из реальных связей данных. */
export interface LinkItem {
  id: string;
  slug: string;
  name: string;
  href: string;
}

/** Ткань в терминах связей каталога. */
export interface FabricNode {
  id: string;
  slug: string;
  name: string;
  /** Швы, которые рекомендуются для обработки среза этой ткани. */
  edgeFinish: string[];
}

/** Шов в терминах связей каталога. */
export interface SeamNode {
  id: string;
  slug: string;
  name: string;
  /** Ткани, которым подходит этот шов. В сидах поле пустое — см. links.ts. */
  preferredFabrics: string[];
}

/** Проект в терминах связей каталога. */
export interface ProjectNode {
  id: string;
  slug: string;
  name: string;
  garmentType: string;
  /** Швы, без которых проект не собрать. */
  seams: string[];
  /** Ткани, рекомендованные для проекта. */
  fabrics: string[];
}

const ids = (r: Row): { id: string; slug: string } => {
  const id = str(r, "id");
  const slug = str(r, "slug");
  return { id: id || slug, slug: slug || id };
};

export const toFabricNode = (r: Row): FabricNode => ({
  ...ids(r),
  name: str(r, "name"),
  edgeFinish: strList(r, "recommended_edge_finish"),
});

export const toSeamNode = (r: Row): SeamNode => ({
  ...ids(r),
  name: str(r, "name"),
  preferredFabrics: strList(r, "preferred_fabrics"),
});

export const toProjectNode = (r: Row): ProjectNode => ({
  ...ids(r),
  name: str(r, "name"),
  garmentType: str(r, "garment_type"),
  seams: strList(r, "required_seams"),
  fabrics: strList(r, "recommended_fabrics"),
});

/** Граф связей каталога: ткань ↔ шов ↔ проект. */
export interface CatalogGraph {
  fabrics: readonly FabricNode[];
  seams: readonly SeamNode[];
  projects: readonly ProjectNode[];
  fabric(slug: string): { seams: LinkItem[]; projects: LinkItem[] };
  seam(slug: string): { fabrics: LinkItem[]; projects: LinkItem[] };
  project(slug: string): { seams: LinkItem[]; fabrics: LinkItem[] };
}

type Keyed = { id: string; slug: string; name: string };

/**
 * Индекс по id И slug: в сидах ссылки могут быть и тем и другим.
 */
function index<T extends Keyed>(list: readonly T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const n of list) {
    m.set(n.id, n);
    m.set(n.slug, n);
  }
  return m;
}

/** Убирает повторы и пустые ссылки (битые ссылки в сидах просто пропускаются). */
function unique<T extends Keyed>(nodes: readonly (T | undefined)[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const n of nodes) {
    if (n && !seen.has(n.slug)) {
      seen.add(n.slug);
      out.push(n);
    }
  }
  return out;
}

const link =
  (base: string) =>
  (n: Keyed): LinkItem => ({
    id: n.id,
    slug: n.slug,
    name: n.name,
    href: `${base}/${encodeURIComponent(n.slug)}`,
  });

const asFabric = link("/fabrics");
const asSeam = link("/seams");
const asProject = link("/projects");

/** Ссылка может быть записана и как id, и как slug. */
const has = (refs: readonly string[], n: Keyed): boolean =>
  refs.includes(n.id) || refs.includes(n.slug);

/**
 * Собирает граф связей каталога.
 *
 * Связи берутся только из данных: `recommended_edge_finish` у ткани,
 * `required_seams` и `recommended_fabrics` у проекта. Поле
 * `preferred_fabrics` у шва пустое во всех сидах, поэтому список тканей для
 * шва собирается инверсией `recommended_edge_finish` — иначе блок был бы
 * всегда пустым.
 */
export function buildCatalogGraph(c: {
  fabrics: readonly FabricNode[];
  seams: readonly SeamNode[];
  projects: readonly ProjectNode[];
}): CatalogGraph {
  const fIdx = index(c.fabrics);
  const sIdx = index(c.seams);

  return {
    ...c,
    fabric(slug) {
      const f = fIdx.get(slug);
      if (!f) return { seams: [], projects: [] };
      return {
        seams: unique(f.edgeFinish.map((r) => sIdx.get(r))).map(asSeam),
        projects: c.projects.filter((p) => has(p.fabrics, f)).map(asProject),
      };
    },
    seam(slug) {
      const s = sIdx.get(slug);
      if (!s) return { fabrics: [], projects: [] };
      const direct = s.preferredFabrics.map((r) => fIdx.get(r));
      const inverted = c.fabrics.filter((f) => has(f.edgeFinish, s));
      return {
        fabrics: unique([...direct, ...inverted]).map(asFabric),
        projects: c.projects.filter((p) => has(p.seams, s)).map(asProject),
      };
    },
    project(slug) {
      const p = c.projects.find((x) => x.slug === slug || x.id === slug);
      if (!p) return { seams: [], fabrics: [] };
      return {
        seams: unique(p.seams.map((r) => sIdx.get(r))).map(asSeam),
        fabrics: unique(p.fabrics.map((r) => fIdx.get(r))).map(asFabric),
      };
    },
  };
}
