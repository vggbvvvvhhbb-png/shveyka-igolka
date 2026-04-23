import { getDbSingleton, queries } from "@shveyka/db";
import { FabricFilters } from "@/components/FabricFilters";
import { FabricCard } from "@/components/FabricCard";

export const dynamic = "force-dynamic";

export default async function FabricsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    weight?: string;
    stretch?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const filters = {
    category: params.category,
    weight: params.weight as
      | "light"
      | "medium"
      | "heavy"
      | "very_heavy"
      | undefined,
    stretch: params.stretch,
    q: params.q,
  };

  const db = getDbSingleton();
  const fabrics = await queries.searchFabrics(db, filters);
  const total = await queries.countFabrics(db, filters);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Каталог тканей</h1>
        <p className="text-stone-600">Найдено {total} тканей</p>
      </div>

      <FabricFilters />

      {fabrics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-stone-600">
            Ничего не найдено. Попробуйте изменить фильтры.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fabrics.map((f) => (
            <FabricCard key={f.id} fabric={f} />
          ))}
        </div>
      )}
    </div>
  );
}
