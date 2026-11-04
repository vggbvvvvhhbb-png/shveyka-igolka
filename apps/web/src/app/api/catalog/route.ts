import { NextResponse } from "next/server";
import { getDbSingleton, queries } from "@shveyka/db";
import { errorResponse, logFailure } from "@/lib/apiResponse";
import { clientIp, limitRequest } from "@/lib/guard";

export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Не удалось получить данные каталога, попробуйте позже";

/**
 * Лимит поиска по каталогу: 120 запросов в минуту с одного адреса.
 *
 * Поиск ничего не стоит провайдеру — это обычное чтение из базы, поэтому
 * лимит щедрый. Он защищает сервер от перебора, а не от расходов.
 */
const SEARCH_RATE_LIMIT = 120;

/** Сколько записей каждого раздела отдаём в ответе. */
const MAX_ITEMS = 8;

/** Запись каталога в ответе. */
interface CatalogItem {
  slug: string;
  name: string;
  /** Короткая подсказка: что это за запись. */
  hint: string;
}

/** Ответ с найденными записями. */
interface CatalogResponse {
  query: string;
  total: number;
  fabrics: CatalogItem[];
  seams: CatalogItem[];
  projects: CatalogItem[];
}

/** Ответ со сводкой по каталогу. */
interface CatalogOverview {
  fabrics: number;
  seams: number;
  projects: number;
}

/** Текст подсказки по ткани: плотность и усадка. */
function fabricHint(fabric: {
  density_min_gsm: number;
  density_max_gsm: number;
  shrinkage_percent: number;
}): string {
  const density =
    fabric.density_min_gsm === fabric.density_max_gsm
      ? `${fabric.density_min_gsm} г/м²`
      : `${fabric.density_min_gsm}–${fabric.density_max_gsm} г/м²`;
  const shrinkage =
    fabric.shrinkage_percent > 0 ? `, усадка до ${fabric.shrinkage_percent}%` : ", без усадки";
  return `плотность ${density}${shrinkage}`;
}

/** Текст подсказки по шву: сложность и когда применять. */
function seamHint(seam: { difficulty: string; when_to_use: string }): string {
  return `${seam.difficulty}: ${seam.when_to_use}`;
}

/** Текст подсказки по проекту: сложность и время. */
function projectHint(project: {
  difficulty: string;
  estimated_time_hours: [number, number];
}): string {
  const [from, to] = project.estimated_time_hours;
  const time = from === to ? `${from} ч` : `${from}–${to} ч`;
  return `${project.difficulty}, ${time}`;
}

/**
 * GET /api/catalog — поиск по справочнику и сводка по нему.
 *
 * Страница каталога и телеграм-бот ищут по одной и той же базе: ответ
 * собирается теми же запросами, что и подсказки помощника, поэтому список
 * совпадает с тем, что человек видит на сайте.
 *
 * Без `q` возвращается сводка: сколько тканей, швов и проектов в каталоге.
 */
export async function GET(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const limited = await limitRequest(req, {
    key: `catalog:${clientIp(req)}`,
    limit: SEARCH_RATE_LIMIT,
    requestId,
    message: "Слишком много запросов к каталогу, подождите минуту",
  });
  if (limited) return limited;

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  try {
    const db = getDbSingleton();

    if (query.length === 0) {
      const [fabrics, seams, projects] = await Promise.all([
        queries.countFabrics(db),
        queries.listSeams(db),
        queries.listProjects(db),
      ]);
      const overview: CatalogOverview = {
        fabrics,
        seams: seams.length,
        projects: projects.length,
      };
      return NextResponse.json(overview);
    }

    const context = await queries.searchContext(db, query, { withMeasurements: false });

    // Полные записи нужны ради плотности и усадки: в контексте подсказки их нет.
    const fullFabrics = await Promise.all(
      context.fabrics.map((fabric) => queries.getFabricBySlug(db, fabric.slug))
    );

    const fabrics: CatalogItem[] = context.fabrics.map((fabric, index) => {
      const full = fullFabrics[index];
      return {
        slug: fabric.slug,
        name: fabric.name,
        hint: full ? fabricHint(full) : fabric.weight_class,
      };
    });

    const seams: CatalogItem[] = context.seams.slice(0, MAX_ITEMS).map((seam) => ({
      slug: seam.slug,
      name: seam.name,
      hint: seamHint(seam),
    }));

    const projects: CatalogItem[] = context.projects.slice(0, MAX_ITEMS).map((project) => ({
      slug: project.slug,
      name: project.name,
      hint: projectHint(project),
    }));

    const response: CatalogResponse = {
      query,
      total: fabrics.length + seams.length + projects.length,
      fabrics,
      seams,
      projects,
    };

    return NextResponse.json(response);
  } catch (err) {
    logFailure("catalog", requestId, err);
    return errorResponse(GENERIC_ERROR, 500, requestId);
  }
}
