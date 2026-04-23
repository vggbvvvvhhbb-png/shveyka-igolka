import Link from "next/link";
import type { Fabric } from "@shveyka/db";

const categoryLabels: Record<string, string> = {
  natural: "Натуральная",
  synthetic: "Синтетическая",
  blend: "Смесовая",
};

const weightLabels: Record<string, string> = {
  light: "Лёгкая",
  medium: "Средняя",
  heavy: "Тяжёлая",
  very_heavy: "Очень тяжёлая",
};

const difficultyDots: Record<string, { dots: string; label: string }> = {
  beginner: { dots: "●○○", label: "Легко работать" },
  intermediate: { dots: "●●○", label: "Средняя сложность" },
  advanced: { dots: "●●●", label: "Сложно работать" },
};

export function FabricCard({ fabric }: { fabric: Fabric }) {
  const difficulty = difficultyDots[fabric.difficulty_to_work_with] ?? {
    dots: "○○○",
    label: "Неизвестно",
  };

  const shortDesc = fabric.composition;

  return (
    <Link
      href={`/fabrics/${fabric.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:bg-stone-50 hover:border-stone-300"
    >
      <h3 className="text-lg font-semibold text-stone-900 mb-1">
        {fabric.name}
      </h3>

      <p className="text-sm text-stone-500 mb-3">
        {categoryLabels[fabric.category] ?? fabric.category} ·{" "}
        {weightLabels[fabric.weight_class] ?? fabric.weight_class}
      </p>

      <p className="text-stone-600 leading-relaxed line-clamp-3 mb-4">
        {shortDesc}
      </p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-amber-600" aria-hidden="true">
          {difficulty.dots}
        </span>
        <span className="text-stone-500">{difficulty.label}</span>
      </div>
    </Link>
  );
}
