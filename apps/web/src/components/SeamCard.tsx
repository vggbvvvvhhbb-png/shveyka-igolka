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
    <Link
      href={`/seams/${seam.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:bg-stone-50 hover:border-stone-300"
    >
      <h3 className="text-lg font-semibold text-stone-900 mb-1">{seam.name}</h3>

      <p className="text-sm text-stone-500 mb-3">{typeLabels[seam.type] ?? seam.type}</p>

      <p className="text-stone-600 leading-relaxed line-clamp-3 mb-4">{seam.when_to_use}</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-amber-600" aria-hidden="true">
          {difficulty.dots}
        </span>
        <span className="text-stone-500">{difficulty.label}</span>
      </div>
    </Link>
  );
}
