import { SeamCard } from "@/components/SeamCard";
import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Каталог швов — Швейка",
};

export default async function SeamsPage() {
  const db = getDbSingleton();
  const seamList = await queries.listSeams(db);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Каталог швов</h1>
        <p className="text-stone-600">Найдено {seamList.length} швов</p>
      </div>

      {seamList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">🧵</p>
          <p className="text-stone-600">Швов пока нет. Загляните позже.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seamList.map((s) => (
            <SeamCard key={s.id} seam={s} />
          ))}
        </div>
      )}
    </div>
  );
}
