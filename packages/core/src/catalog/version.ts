/**
 * Версия каталога — самая свежая `updated_at` среди всех записей.
 *
 * Используется в двух местах: `lastModified` в sitemap и ключ кэша ответов.
 * Правка любой записи меняет версию, поэтому старые ключи кэша устаревают
 * сами — вручную чистить кэш не нужно.
 */
export function computeCatalogVersion(
  updatedAt: readonly (Date | string | null | undefined)[]
): string {
  let max = 0;
  for (const v of updatedAt) {
    if (!v) continue;
    const t = new Date(v).getTime();
    if (Number.isFinite(t) && t > max) max = t;
  }
  return String(max);
}

/** Версия каталога как дата для sitemap; `null`, если записей ещё не было. */
export function catalogVersionDate(version: string): Date | null {
  const t = Number(version);
  if (!Number.isFinite(t) || t <= 0) return null;
  return new Date(t);
}
