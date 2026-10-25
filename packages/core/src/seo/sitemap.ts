export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}

/**
 * Базовый адрес: только http(s), без завершающего «/».
 *
 * Мусор и не-http схемы отбрасываются — иначе в sitemap попадёт
 * `javascript:` или пустая строка.
 */
export function normalizeBaseUrl(
  raw: string | undefined,
  fallback = "http://localhost:3000"
): string {
  try {
    const u = new URL(raw?.trim() ?? "");
    if (u.protocol !== "http:" && u.protocol !== "https:") return fallback;
    return u.origin;
  } catch {
    return fallback;
  }
}

/**
 * Собирает адреса для sitemap: главная, статические разделы и все
 * детальные страницы каталога.
 */
export function buildSitemap(
  base: string,
  input: {
    statics: readonly string[];
    fabrics: readonly string[];
    seams: readonly string[];
    projects: readonly string[];
  },
  lastModified?: Date
): SitemapEntry[] {
  const at = (path: string) => `${base}${path}`;

  const detail = (prefix: string, slugs: readonly string[]): SitemapEntry[] =>
    slugs.map((s) => ({
      url: at(`${prefix}/${encodeURIComponent(s)}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  return [
    { url: at("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    ...input.statics.map<SitemapEntry>((p) => ({
      url: at(p),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...detail("/fabrics", input.fabrics),
    ...detail("/seams", input.seams),
    ...detail("/projects", input.projects),
  ];
}
