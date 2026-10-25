import Link from "next/link";
import { recommendStart } from "@shveyka/core";
import { loadCatalog } from "@/lib/catalog";

export const metadata = {
  title: "С чего начать — Швейка",
  description: "Подберём проект, ткань и шов по трём вопросам — из каталога Швейки.",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const one = (q: SearchParams, key: string): string | undefined =>
  typeof q[key] === "string" ? (q[key] as string) : undefined;

const SELECT =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export default async function StartPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const q = await searchParams;
  const { graph } = await loadCatalog();

  const garment = one(q, "garment") || undefined;
  const fabric = one(q, "fabric") || undefined;
  const own = one(q, "own");

  const answers = {
    garment,
    fabric,
    ownMachine: own === undefined ? undefined : own === "1",
  };

  // Рекомендация показывается только после отправки формы: пустой ответ
  // ничего не советует.
  const asked = Object.keys(q).length > 0;
  const rec = asked ? recommendStart(graph, answers) : null;

  // Подпись типа изделия — название первого проекта этого типа: словарь
  // из десяти garment_type не нужен.
  const garments = [
    ...new Map(
      graph.projects.filter((p) => p.garmentType).map((p) => [p.garmentType, p.name] as const)
    ).entries(),
  ];

  // Изделие, которого в каталоге нет: показываем это прямо, а не молчим.
  const garmentUnknown = Boolean(garment) && !graph.projects.some((p) => p.garmentType === garment);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-stone-900">С чего начать</h1>
        <p className="text-stone-600 leading-relaxed">
          Ответьте на три вопроса — подберём проект, ткань и шов из каталога Швейки.
        </p>
      </div>

      <form
        method="get"
        className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5 dark:border-stone-700 dark:bg-stone-900"
      >
        <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Что шьёте чаще?
          <select name="garment" defaultValue={garment ?? ""} className={SELECT}>
            <option value="">Пока не знаю</option>
            {garments.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Какая ткань под рукой?
          <select name="fabric" defaultValue={fabric ?? ""} className={SELECT}>
            <option value="">Пока никакой</option>
            {graph.fabrics.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
          Шьёте на Brother LS-200s?
          <select name="own" defaultValue={own ?? "1"} className={SELECT}>
            <option value="1">Да</option>
            <option value="0">Нет, на другой</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg bg-orange-700 px-4 py-2 font-medium text-white hover:bg-orange-800"
        >
          Подобрать
        </button>
      </form>

      {rec && (
        <section className="space-y-4" aria-live="polite">
          <h2 className="text-xl font-semibold text-stone-900">Что советуем</h2>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3 dark:border-stone-700 dark:bg-stone-900">
            {rec.project ? (
              <p className="text-stone-800">
                <span className="text-stone-500">Проект: </span>
                <Link
                  className="font-medium underline underline-offset-4 hover:text-stone-600"
                  href={rec.project.href}
                >
                  {rec.project.name}
                </Link>
              </p>
            ) : null}

            {rec.fabrics.length > 0 && (
              <p className="text-stone-800">
                <span className="text-stone-500">Ткани: </span>
                {rec.fabrics.map((f, i) => (
                  <span key={f.slug}>
                    {i > 0 && ", "}
                    <Link
                      className="font-medium underline underline-offset-4 hover:text-stone-600"
                      href={f.href}
                    >
                      {f.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}

            {rec.seam && (
              <p className="text-stone-800">
                <span className="text-stone-500">Шов: </span>
                <Link
                  className="font-medium underline underline-offset-4 hover:text-stone-600"
                  href={rec.seam.href}
                >
                  {rec.seam.name}
                </Link>
              </p>
            )}

            {(garmentUnknown || (!rec.project && rec.fabrics.length === 0)) && (
              <p className="text-stone-600">
                Под такой выбор в каталоге пока ничего нет — попробуйте изменить ответы.
              </p>
            )}

            {rec.machineNote && (
              <p className="text-sm text-stone-600 dark:text-stone-400">{rec.machineNote}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
