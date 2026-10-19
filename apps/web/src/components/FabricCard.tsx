"use client";

import Link from "next/link";
import { splitHighlightedText } from "@shveyka/core";
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

/**
 * Текст, в котором совпадения с поисковым запросом подсвечены.
 * Без запроса текст выводится как есть.
 */
function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query) {
    return <>{text}</>;
  }

  return (
    <>
      {splitHighlightedText(text, query).map((part, index) =>
        part.highlighted ? (
          <mark key={index} className="rounded bg-stone-200 px-0.5 text-stone-900">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

/**
 * Карточка ткани. В query приходит поисковый запрос со страницы каталога:
 * совпадения с ним подсвечиваются в названии и составе.
 */
export function FabricCard({ fabric, query }: { fabric: Fabric; query?: string }) {
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
        <HighlightedText text={fabric.name} query={query} />
      </h3>

      <p className="text-sm text-stone-500 mb-3">
        {categoryLabels[fabric.category] ?? fabric.category} ·{" "}
        {weightLabels[fabric.weight_class] ?? fabric.weight_class}
      </p>

      <p className="text-stone-600 leading-relaxed line-clamp-3 mb-4">
        <HighlightedText text={shortDesc} query={query} />
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
