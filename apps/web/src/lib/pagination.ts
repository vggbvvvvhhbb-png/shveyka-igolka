/**
 * Постраничная выдача каталога.
 *
 * Размер страницы задан здесь в одном месте: его используют и серверная
 * страница, и скелетоны загрузки, и навигация.
 */

/** Сколько записей показываем на одной странице. */
export const PAGE_SIZE = 12;

/** Сортировки, которые понимает каталог тканей. */
export type CatalogSort = "name" | "weight" | "difficulty";

/** Параметры каталога, которые переносятся из одной ссылки в другую. */
export type CatalogQuery = Record<string, string | undefined>;

/**
 * Приводит значение page из адресной строки к номеру страницы.
 * Некорректное и отрицательное значение ведут на первую страницу.
 */
export function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

/**
 * Сортировка из адресной строки. Неизвестное значение — сортировка по названию.
 */
export function parseSort(raw: string | undefined): CatalogSort | undefined {
  if (raw === "name" || raw === "weight" || raw === "difficulty") {
    return raw;
  }
  return undefined;
}

/** Число страниц по общему числу записей. */
export function getTotalPages(total: number, pageSize: number = PAGE_SIZE): number {
  if (total <= 0) {
    return 1;
  }
  return Math.ceil(total / pageSize);
}

/** Номер страницы, который точно есть в выдаче. */
export function clampPage(page: number, totalPages: number): number {
  if (page < 1) {
    return 1;
  }
  if (page > totalPages) {
    return totalPages;
  }
  return page;
}

/**
 * Ссылка на страницу каталога с сохранением текущих фильтров.
 * Первая страница номером не помечается — так адрес остаётся коротким.
 */
export function buildPageHref(basePath: string, query: CatalogQuery, page: number): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}
