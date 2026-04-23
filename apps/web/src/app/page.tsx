import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDbSingleton();
  const fabricList = await queries.listFabrics(db, { weightClass: "medium" });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Shveyka — Ткани средней плотности</h1>
      <ul className="list-disc pl-5 space-y-1">
        {fabricList.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-gray-500">Найдено тканей: {fabricList.length}</p>
    </main>
  );
}
