import Link from "next/link";
import { notFound } from "next/navigation";
import { estimateMeters, rankFabricsForProject, type CompatVerdict } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

const ROLL_WIDTHS = [140, 150, 220];
const DEFAULT_BASE_METERS = 2;
const VERDICT_LABELS: Record<CompatVerdict, string> = {
  fits: "Подходит",
  with_caveats: "Подходит с оговорками",
  poor: "Не подходит",
};
const VERDICT_STYLES: Record<CompatVerdict, string> = {
  fits: "bg-green-wash text-green",
  with_caveats: "bg-gold-wash text-orange",
  poor: "bg-wash-2 text-ink-2",
};

function parseBaseMeters(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return DEFAULT_BASE_METERS;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value >= 0.1 && value <= 50 ? value : null;
}

/**
 * Какая ткань подойдёт для проекта: все ткани каталога с оценкой совместимости
 * (вес, швы, сложность, усадка) и метражом с учётом ширины рулона и усадки.
 * ?m= — метраж по выкройке для ширины 150 см, ?w= — ширина рулона.
 */
export default async function ProjectMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ m?: string; w?: string }>;
}) {
  const { slug } = await params;
  const { m, w } = await searchParams;

  const db = getDbSingleton();
  const project = await queries.findProjectForMatch(db, slug);
  if (!project) notFound();

  const requestedWidth = Number(w);
  const width = ROLL_WIDTHS.includes(requestedWidth) ? requestedWidth : 150;
  const parsedMeters = parseBaseMeters(m);
  const baseMeters = parsedMeters ?? DEFAULT_BASE_METERS;

  const fabrics = await queries.listFabricsForMatch(db);
  const shrinkage = new Map(fabrics.map((fabric) => [fabric.id, fabric.shrinkage_percent]));
  const ranked = rankFabricsForProject(project, fabrics);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <nav className="text-sm text-ink-3">
        <Link href="/projects" className="hover:text-ink">
          Проекты
        </Link>
        {" / "}
        <Link href={`/projects/${slug}`} className="hover:text-ink">
          {project.name}
        </Link>
        {" / "}
        <span className="text-ink">Подбор ткани</span>
      </nav>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-ink">Какая ткань подойдёт: {project.name}</h1>
        <p className="text-ink-2">
          Ткани каталога, от самой подходящей. Оценка учитывает вес, швы, сложность и усадку.
        </p>
      </div>

      <form method="get" className="space-y-3 rounded-plate border border-hair bg-paper p-4">
        <p className="text-ink-2">
          Формула проекта: <span className="text-ink">{project.fabric_amount_formula}</span>
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-ink-2">
            Метраж по выкройке, м (для ширины 150 см)
            <input
              name="m"
              defaultValue={m ?? String(DEFAULT_BASE_METERS)}
              inputMode="decimal"
              className="block w-32 rounded-plate border border-hair-2 bg-paper-hi p-2 text-ink"
            />
          </label>
          <label className="space-y-1 text-ink-2">
            Ширина рулона
            <select
              name="w"
              defaultValue={String(width)}
              className="block rounded-plate border border-hair-2 bg-paper-hi p-2 text-ink"
            >
              {ROLL_WIDTHS.map((option) => (
                <option key={option} value={option}>
                  {option} см
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-plate bg-thread px-5 py-2 text-paper-hi hover:bg-thread-2"
          >
            Пересчитать
          </button>
        </div>
        {parsedMeters === null && (
          <p role="alert" className="text-sm text-thread">
            Метраж — число от 0,1 до 50. Показан расчёт для {DEFAULT_BASE_METERS} м.
          </p>
        )}
      </form>

      <ul className="space-y-3">
        {ranked.map((result) => {
          const percent = shrinkage.get(result.fabricId) ?? 0;
          const meters = estimateMeters({
            baseMeters,
            widthCm: width,
            shrinkagePercent: percent,
          });
          return (
            <li
              key={result.fabricId}
              className="space-y-2 rounded-plate border border-hair bg-paper-hi p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/fabrics/${result.fabricId}`}
                  className="text-lg font-semibold text-ink underline-offset-2 hover:underline"
                >
                  {result.fabricName}
                </Link>
                <span
                  className={`rounded-full px-3 py-1 text-sm ${VERDICT_STYLES[result.verdict]}`}
                >
                  {VERDICT_LABELS[result.verdict]} · {result.score}
                </span>
              </div>
              <p className="text-ink-2">
                Купить: <strong>{meters.toString().replace(".", ",")} м</strong> при ширине {width}{" "}
                см
                {percent > 0 ? `, с запасом на усадку ${percent}%` : ""}
              </p>
              {result.pros.length > 0 && (
                <ul className="list-disc pl-5 text-ink-2">
                  {result.pros.map((pro) => (
                    <li key={pro}>{pro}</li>
                  ))}
                </ul>
              )}
              {result.warnings.length > 0 && (
                <ul className="list-disc pl-5 text-orange">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
