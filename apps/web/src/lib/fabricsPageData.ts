import { cache } from "react";
import { getDbSingleton, queries } from "@shveyka/db";
import type { Fabric, FabricFilters } from "@shveyka/db";

/**
 * Cached page-level data fetcher for /fabrics.
 * Dedupes identical requests in a single React render pass
 * and runs search + count in parallel via Promise.all.
 */
export const getFabricsPageData = cache(
  async (filters: FabricFilters = {}): Promise<{ fabrics: Fabric[]; total: number }> => {
    const db = getDbSingleton();
    const [fabricList, total] = await Promise.all([
      queries.searchFabrics(db, filters),
      queries.countFabrics(db, filters),
    ]);
    return { fabrics: fabricList, total };
  }
);
