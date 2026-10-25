import type { CatalogGraph, LinkItem } from "../catalog/links";

/** Ответы стартового экрана. */
export interface StartAnswers {
  /** Тип изделия: garment_type проекта, как его видит каталог. */
  garment?: string;
  /** slug выбранной ткани. */
  fabric?: string;
  /** Шьёт ли посетитель на Brother LS-200s. */
  ownMachine?: boolean;
}

/** Что показать по ответам. */
export interface StartRecommendation {
  /** Ткани: выбранная и рекомендованная проектом, не больше двух. */
  fabrics: LinkItem[];
  /** Проект под изделие, а если выбрана ткань — под ткань тоже. */
  project: LinkItem | null;
  /** Шов: первый из required_seams проекта, иначе первый шов ткани. */
  seam: LinkItem | null;
  /** Честная заметка, если машина посетителя другая. */
  machineNote: string | null;
}

const MACHINE_NOTE =
  "Настройки в каталоге даны для Brother LS-200s — на другой машине сверяйтесь с её инструкцией.";

/** Ссылка на запись каталога. */
const link = (n: { slug: string; name: string }, base: string): LinkItem => ({
  id: n.slug,
  slug: n.slug,
  name: n.name,
  href: `${base}/${encodeURIComponent(n.slug)}`,
});

/**
 * Подбор по трём ответам: изделие, ткань, машина.
 *
 * Всё берётся из связей каталога: подходящий проект, ткани этого проекта и
 * нужный ему шов. Если изделие незнакомое — проект не подставляется случайный,
 * а остаётся пустым: честнее сказать «ничего не нашлось».
 */
export function recommendStart(g: CatalogGraph, a: StartAnswers): StartRecommendation {
  const fabric = a.fabric
    ? g.fabrics.find((f) => f.slug === a.fabric || f.id === a.fabric)
    : undefined;

  // Проекты, которым подходит выбранная ткань: она стоит выше, чем простое
  // совпадение по изделию.
  const fabricProjects = fabric ? g.fabric(fabric.slug).projects.map((p) => p.slug) : [];

  const candidates = g.projects.filter((p) => !a.garment || p.garmentType === a.garment);

  // Без изделия и без ткани подбирать нечего: подставлять случайный проект
  // значит советовать наугад.
  const project =
    a.garment || a.fabric
      ? (candidates.find((p) => fabricProjects.includes(p.slug)) ?? candidates[0])
      : undefined;

  const fabrics: LinkItem[] = [];
  const push = (l: LinkItem): void => {
    if (fabrics.length < 2 && !fabrics.some((x) => x.slug === l.slug)) fabrics.push(l);
  };

  if (fabric) push(link(fabric, "/fabrics"));
  if (project) g.project(project.slug).fabrics.forEach(push);

  const seam = project
    ? (g.project(project.slug).seams[0] ?? null)
    : fabric
      ? (g.fabric(fabric.slug).seams[0] ?? null)
      : null;

  return {
    fabrics,
    project: project ? link(project, "/projects") : null,
    seam,
    machineNote: a.ownMachine === false ? MACHINE_NOTE : null,
  };
}
