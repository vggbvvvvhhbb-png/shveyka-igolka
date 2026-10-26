import { FabricFilters } from "@/components/FabricFilters";
import { FabricCard } from "@/components/FabricCard";
import { Pagination } from "@/components/Pagination";
import { SortSelect } from "@/components/SortSelect";
import { getFabricsPageData } from "@/lib/fabricsPageData";
import {
  clampPage,
  getTotalPages,
  PAGE_SIZE,
  parsePage,
  parseSort,
  type CatalogQuery,
} from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function FabricsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    weight?: string;
    stretch?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const sort = parseSort(params.sort) ?? "name";
  const requestedPage = parsePage(params.page);

  const filters = {
    category: params.category,
    weight: params.weight as "light" | "medium" | "heavy" | "very_heavy" | undefined,
    stretch: params.stretch,
    q: params.q,
    sort,
  };

  const { fabrics, total } = await getFabricsPageData({
    ...filters,
    limit: PAGE_SIZE,
    offset: (requestedPage - 1) * PAGE_SIZE,
  });

  const totalPages = getTotalPages(total);
  const page = clampPage(requestedPage, totalPages);

  // Запрошенная страница оказалась за пределами выдачи: читаем последнюю.
  const visibleFabrics =
    page === requestedPage
      ? fabrics
      : (
          await getFabricsPageData({
            ...filters,
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
          })
        ).fabrics;

  // Фильтры и сортировка, которые переносятся из ссылки в ссылку.
  const query: CatalogQuery = {
    category: params.category,
    weight: params.weight,
    stretch: params.stretch,
    q: params.q,
    sort,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Каталог тканей</h1>
        <p className="text-stone-600">Найдено {total} тканей</p>
      </div>

      <FabricFilters />

      <div className="flex justify-end">
        <SortSelect value={sort} query={query} />
      </div>

      {visibleFabrics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-stone-600">
            Ничего не найдено. Попробуйте изменить запрос или фильтры.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFabrics.map((f) => (
            <FabricCard key={f.id} fabric={f} query={params.q} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} query={query} basePath="/fabrics" />
    </div>
  );
}
