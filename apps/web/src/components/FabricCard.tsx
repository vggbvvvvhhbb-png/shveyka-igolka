"use client";

import Link from "next/link";
import { splitHighlightedText } from "@shveyka/core";
import type { Fabric } from "@shveyka/db";
import { classifyWeave, renderWeaveTile, type WeaveKind } from "@shveyka/core";

/**
 * Карточка ткани — «гербарный лист» с этикеткой.
 *
 * Образец ткани рисуется кодом: плитка плетения подставляется фоном, а по
 * нижнему краю идёт зубчатая кромка, как у вырезанного куска материи.
 *
 * В query приходит поисковый запрос со страницы каталога: совпадения с ним
 * подсвечиваются в названии и составе.
 */

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

/** Плотность: четыре кружка, закрашено столько, сколько весит ткань. */
const densityLevels: Record<string, number> = {
  light: 1,
  medium: 2,
  heavy: 3,
  very_heavy: 4,
};

/** Сложность работы: сколько игл заполнено. */
const difficultyLevels: Record<string, number> = {
  beginner: 1,
  intermediate: 3,
  advanced: 5,
};

/** Цвета нитей для каждого вида плетения: краска, а не фотография. */
const weaveColors: Record<WeaveKind, { warp: string; weft: string }> = {
  plain: { warp: "#c6b394", weft: "#e0d5be" },
  twill: { warp: "#5b7186", weft: "#8299ac" },
  satin: { warp: "#3f6350", weft: "#789a88" },
  knit: { warp: "#98a199", weft: "#bcc3bb" },
  rib: { warp: "#a8756a", weft: "#c69c92" },
  velvet: { warp: "#6b3a3a", weft: "#8d5656" },
  gauze: { warp: "#c8c2b0", weft: "#e2ddcd" },
};

/** Плитка плетения как фон: SVG кодируется прямо в CSS. */
function tileBackground(kind: WeaveKind): string {
  const colors = weaveColors[kind];
  const tile = renderWeaveTile(kind, { warp: colors.warp, weft: colors.weft });
  return `url("data:image/svg+xml,${encodeURIComponent(tile)}")`;
}

/** Зубчатый нижний край образца. */
function PinkedEdge() {
  const teeth = 22;
  const step = 120 / teeth;
  const d = Array.from(
    { length: teeth },
    (_, i) =>
      `M${(i * step).toFixed(2)} 5V2.6L${(i * step + step / 2).toFixed(2)} 0L${((i + 1) * step).toFixed(2)} 2.6V5Z`
  ).join("");

  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-2.5 w-full"
      viewBox="0 0 120 5"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill="var(--paper-hi)" />
    </svg>
  );
}

/** Булавка, которой образец приколот к листу. */
function Pin() {
  return (
    <svg
      className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <circle cx="10" cy="7" r="4" fill="var(--paper-hi)" stroke="var(--ink-2)" strokeWidth="1" />
      <circle cx="10" cy="7" r="1.3" fill="var(--thread)" />
      <path d="M10 11V19" stroke="var(--ink-2)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Плотность четырьмя кружками. */
function DensityDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Плотность ${level} из 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full border"
          style={{
            borderColor: i <= level ? "var(--green)" : "var(--hair-2)",
            background: i <= level ? "var(--green)" : "transparent",
          }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** Сложность иголками: сколько игл заполнено. */
function Needles({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 6 15" className="h-4 w-1.5" aria-hidden="true">
          <path
            d="M3 1V11"
            stroke={i <= level ? "var(--ink-2)" : "var(--hair-2)"}
            strokeWidth="1"
            strokeLinecap="round"
          />
          <circle
            cx="3"
            cy="12.8"
            r="1.2"
            fill={i <= level ? "var(--ink-2)" : "none"}
            stroke={i <= level ? "none" : "var(--hair-2)"}
            strokeWidth=".8"
          />
        </svg>
      ))}
    </span>
  );
}

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
          <mark key={index} className="rounded-sm bg-gold-wash px-0.5 text-ink">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

export function FabricCard({ fabric, query }: { fabric: Fabric; query?: string }) {
  const weave = classifyWeave({
    name: fabric.name,
    composition: fabric.composition,
  });
  const density = densityLevels[fabric.weight_class] ?? 2;
  const difficulty = difficultyLevels[fabric.difficulty_to_work_with] ?? 2;

  return (
    <Link href={`/fabrics/${fabric.id}`} className="card-plate overflow-hidden p-0">
      {/* Образец ткани */}
      <div
        className="relative h-32 border-b border-hair"
        style={{ backgroundImage: tileBackground(weave), backgroundSize: "44px 44px" }}
      >
        <Pin />
        <PinkedEdge />
      </div>

      {/* Этикетка */}
      <div className="space-y-2 p-4">
        <h3 className="font-title text-xl font-bold text-green">
          <HighlightedText text={fabric.name} query={query} />
        </h3>

        <p className="text-xs leading-relaxed text-ink-3">
          {categoryLabels[fabric.category] ?? fabric.category} ·{" "}
          {weightLabels[fabric.weight_class] ?? fabric.weight_class} ·{" "}
          <HighlightedText text={fabric.composition} query={query} />
        </p>

        <div className="flex items-center justify-between border-t border-hair pt-2">
          <DensityDots level={density} />
          <Needles level={difficulty} />
        </div>
      </div>
    </Link>
  );
}
