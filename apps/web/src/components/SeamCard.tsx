import Link from "next/link";
import type { Seam } from "@shveyka/db";

const typeLabels: Record<string, string> = {
  join: "Соединительный",
  edge_finish: "Обработка среза",
  hem: "Подгиб",
  decorative: "Декоративный",
  closure: "Застёжка",
  facing: "Обтачка",
};

const difficultyDots: Record<string, { dots: string; label: string }> = {
  beginner: { dots: "●○○", label: "Легко выполнить" },
  intermediate: { dots: "●●○", label: "Средняя сложность" },
  advanced: { dots: "●●●", label: "Сложно выполнить" },
};

export function SeamCard({ seam }: { seam: Seam }) {
  const difficulty = difficultyDots[seam.difficulty] ?? {
    dots: "○○○",
    label: "Неизвестно",
  };

  return (
    <Link href={`/seams/${seam.id}`} className="card-plate p-5">
      <h3 className="mb-1 font-title text-xl font-bold text-green">{seam.name}</h3>

      <p className="mb-3 text-sm text-ink-3">{typeLabels[seam.type] ?? seam.type}</p>

      <p className="mb-4 line-clamp-3 leading-relaxed text-ink-2">{seam.when_to_use}</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-orange" aria-hidden="true">
          {difficulty.dots}
        </span>
        <span className="text-ink-3">{difficulty.label}</span>
      </div>
    </Link>
  );
}
