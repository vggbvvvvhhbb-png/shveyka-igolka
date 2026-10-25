import type { MetadataRoute } from "next";
import { buildSitemap, catalogVersionDate } from "@shveyka/core";
import { loadCatalog } from "@/lib/catalog";
import { SITE_URL, STATIC_PAGES } from "@/lib/site";

// Динамически: сборка не должна требовать доступной БД.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { graph, version } = await loadCatalog();

  return buildSitemap(
    SITE_URL,
    {
      statics: STATIC_PAGES,
      fabrics: graph.fabrics.map((f) => f.slug),
      seams: graph.seams.map((s) => s.slug),
      projects: graph.projects.map((p) => p.slug),
    },
    catalogVersionDate(version) ?? undefined
  );
}
