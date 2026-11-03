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
    <Link href={`/projects/${project.id}`} className="card-plate p-5">
      <h3 className="mb-1 font-title text-xl font-bold text-green">{project.name}</h3>

      <p className="mb-3 text-sm text-ink-3">
        {categoryLabels[project.category] ?? project.category} · {timeLabel}
      </p>

      <p className="mb-4 line-clamp-3 leading-relaxed text-ink-2">{mainFabric}</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-orange" aria-hidden="true">
          {difficulty.dots}
        </span>
        <span className="text-ink-3">{difficulty.label}</span>
      </div>
    </Link>
  );
}
