import Link from "next/link";
import type { Project } from "@shveyka/db";

const categoryLabels: Record<string, string> = {
  clothing: "Одежда",
  home_textile: "Домашний текстиль",
};

const difficultyDots: Record<string, { dots: string; label: string }> = {
  beginner: { dots: "●○○", label: "Легко работать" },
  intermediate: { dots: "●●○", label: "Средняя сложность" },
  advanced: { dots: "●●●", label: "Сложно работать" },
};

export function ProjectCard({ project }: { project: Project }) {
  const difficulty = difficultyDots[project.difficulty] ?? {
    dots: "○○○",
    label: "Неизвестно",
  };

  const [minHours, maxHours] = project.estimated_time_hours as [number, number];
  const timeLabel = minHours === maxHours ? `${minHours} ч` : `${minHours}–${maxHours} ч`;

  const mainFabric = (project.materials as { main_fabric: string }).main_fabric;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:bg-stone-50 hover:border-stone-300"
    >
      <h3 className="text-lg font-semibold text-stone-900 mb-1">{project.name}</h3>

      <p className="text-sm text-stone-500 mb-3">
        {categoryLabels[project.category] ?? project.category} · {timeLabel}
      </p>

      <p className="text-stone-600 leading-relaxed line-clamp-3 mb-4">{mainFabric}</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-amber-600" aria-hidden="true">
          {difficulty.dots}
        </span>
        <span className="text-stone-500">{difficulty.label}</span>
      </div>
    </Link>
  );
}
