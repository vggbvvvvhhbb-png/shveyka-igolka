import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbSingleton, queries } from "@shveyka/db";
import { AskShveykaButton } from "@/components/AskShveykaButton";
import { ProjectChecklist } from "@/components/ProjectChecklist";
import type { ProjectStep } from "@shveyka/core";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  clothing: "Одежда",
  home_textile: "Домашний текстиль",
};

const difficultyInfo: Record<string, { dots: string; label: string }> = {
  beginner: { dots: "●○○", label: "Легко работать" },
  intermediate: { dots: "●●○", label: "Средняя сложность" },
  advanced: { dots: "●●●", label: "Сложно работать" },
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDbSingleton();
  const project = await queries.getProjectWithResolvedRefs(db, slug);

  if (!project) {
    notFound();
  }

  const diff = difficultyInfo[project.difficulty] ?? {
    dots: "○○○",
    label: "Неизвестно",
  };

  const [minHours, maxHours] = project.estimated_time_hours as [number, number];
  const timeLabel = minHours === maxHours ? `${minHours} ч` : `${minHours}–${maxHours} ч`;

  const materials = project.materials as { main_fabric: string; notions: string[] };
  const seamAllowances = project.seam_allowances as {
    side: number;
    shoulder: number;
    neckline: number;
    armhole: number;
    hem: number;
  };
  const steps = project.steps as ProjectStep[];
  const checklist = project.final_checklist as string[];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-800">
          Главная
        </Link>
        {" / "}
        <Link href="/projects" className="hover:text-stone-800">
          Проекты
        </Link>
        {" / "}
        <span className="text-stone-800">{project.name}</span>
      </nav>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-stone-900">{project.name}</h1>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
            {categoryLabels[project.category] ?? project.category}
          </span>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
            Время: {timeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 text-base">
          <span className="text-amber-600" aria-hidden="true">
            {diff.dots}
          </span>
          <span className="text-stone-600">{diff.label}</span>
        </div>
      </div>

      {/* Спросить помощника об этом проекте и подобрать ткань */}
      <div className="flex flex-wrap items-center gap-3">
        <AskShveykaButton question={`Как сшить проект «${project.name}» на Brother LS-200s?`} />
        <Link
          href={`/projects/${project.id}/match`}
          className="inline-block text-stone-800 hover:text-stone-600 underline underline-offset-2"
        >
          Какая ткань подойдёт
        </Link>
      </div>

      {/* Materials and fabric amount */}
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Материалы</h2>
        <p className="text-stone-700 leading-relaxed">{materials.main_fabric}</p>
        <p className="text-stone-700 leading-relaxed">
          <span className="text-stone-500">Расчёт ткани: </span>
          {project.fabric_amount_formula}
        </p>
        {materials.notions.length > 0 && (
          <ul className="list-disc pl-5 space-y-1 text-stone-700">
            {materials.notions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Seam allowances */}
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Припуски на шов, см</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-base">
          <dt className="text-stone-500">По боковым срезам</dt>
          <dd className="text-stone-800">{seamAllowances.side}</dd>
          <dt className="text-stone-500">По плечу</dt>
          <dd className="text-stone-800">{seamAllowances.shoulder}</dd>
          <dt className="text-stone-500">По горловине</dt>
          <dd className="text-stone-800">{seamAllowances.neckline}</dd>
          <dt className="text-stone-500">По пройме</dt>
          <dd className="text-stone-800">{seamAllowances.armhole}</dd>
          <dt className="text-stone-500">По низу</dt>
          <dd className="text-stone-800">{seamAllowances.hem}</dd>
        </dl>
      </section>

      {/* Required seams */}
      {project.required_seams.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-3">Необходимые швы</h2>
          <ul className="space-y-2">
            {project.required_seams.map((seamSlug) => {
              const seam = project.resolvedSeams.find((s) => s.id === seamSlug);
              return (
                <li key={seamSlug}>
                  <Link
                    href={`/seams/${seamSlug}`}
                    className="text-stone-800 hover:text-stone-600 underline underline-offset-2"
                  >
                    {seam?.name ?? seamSlug.replace(/-/g, " ")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Steps */}
      <section>
        <h2 className="text-xl font-semibold text-stone-900 mb-3">Пошаговая инструкция</h2>
        <ol className="space-y-5">
          {steps.map((step) => (
            <li
              key={step.order}
              className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-stone-900">
                  {step.order}. {step.title}
                </h3>
                {step.estimated_minutes !== undefined && (
                  <span className="text-sm text-stone-500 whitespace-nowrap">
                    {step.estimated_minutes} мин
                  </span>
                )}
              </div>
              <p className="text-stone-700 leading-relaxed">{step.description}</p>
              {step.tip && (
                <p className="text-stone-600 italic leading-relaxed">Совет: {step.tip}</p>
              )}
              {step.seam_ref && (
                <Link
                  href={`/seams/${step.seam_ref}`}
                  className="inline-block text-sm text-stone-800 hover:text-stone-600 underline underline-offset-2"
                >
                  Как выполнить шов
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Final checklist */}
      {checklist.length > 0 && <ProjectChecklist slug={project.id} items={checklist} />}

      {/* Recommended fabrics */}
      {project.resolvedFabrics.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-3">Подходящие ткани</h2>
          <ul className="space-y-2">
            {project.resolvedFabrics.map((fabric) => (
              <li key={fabric.id}>
                <Link
                  href={`/fabrics/${fabric.id}`}
                  className="text-stone-800 hover:text-stone-600 underline underline-offset-2"
                >
                  {fabric.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900"
        >
          ← Назад к каталогу
        </Link>
      </div>
    </div>
  );
}
