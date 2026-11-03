"use client";

import { useState } from "react";
import { classifyWeave, renderWeaveSvg, type WeaveKind } from "@shveyka/core";

/**
 * Иллюстрация плетения ткани: полотно с выносками и линейка-масштаб.
 *
 * Плетение рисуется кодом, вид подбирается по названию и составу ткани.
 * Выноски лежат поверх полотна отдельным слоем SVG: у каждой кружок с
 * номером, тонкая линия к нужному месту на ткани и подпись. Состав выносок
 * зависит от вида плетения: у сатина есть долевая нить, у саржи — косая
 * линия, у бархата — ворс.
 *
 * Легенда под рисунком работает как указатель: наводишь на «уток» — основа
 * приглушается, и видно, как нити ложатся друг на друга.
 *
 * Линейка внизу — настоящий ползунок: он увеличивает полотно от 1× до 3×.
 * Полотно при этом обрезается краем рамки, а не растягивается.
 */

const weaveColors: Record<WeaveKind, { warp: string; weft: string }> = {
  plain: { warp: "#c6b394", weft: "#e0d5be" },
  twill: { warp: "#5b7186", weft: "#8299ac" },
  satin: { warp: "#3f6350", weft: "#789a88" },
  knit: { warp: "#98a199", weft: "#bcc3bb" },
  rib: { warp: "#a8756a", weft: "#c69c92" },
  velvet: { warp: "#6b3a3a", weft: "#8d5656" },
  gauze: { warp: "#c8c2b0", weft: "#e2ddcd" },
};

const weaveLabels: Record<WeaveKind, string> = {
  plain: "полотняное",
  twill: "саржевое",
  satin: "атласное",
  knit: "трикотажное",
  rib: "рельефное",
  velvet: "ворсовое",
  gauze: "сетчатое",
};

/** Размер полотна в единицах SVG. */
const CLOTH = { width: 480, height: 300 };

/** Размер плиты: полотно и поля слева, где стоят подписи выносок. */
const PLATE = { width: 660, height: 360 };

/** Положение полотна на плите. */
const CLOTH_X = 140;
const CLOTH_Y = 30;

/** Число нитей основы на полотне: от него зависят точки выносок. */
const THREADS = 16;

/** Кружок выноски: центр и радиус. */
const RING_X = 22;
const RING_R = 8.5;

/** Строки подписей выносок: по одной на выноску, сверху вниз. */
const LABEL_ROWS = [64, 144, 224, 304];

/** Границы линейки-масштаба. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

/** Выноска: подпись на плите, пояснение в легенде и точка на полотне. */
type Callout = {
  /** Идентификатор слоя: по нему легенда подсвечивает нужную часть SVG. */
  id: string;
  /** Подпись на плите. */
  label: string;
  /** Пояснение в легенде. */
  note: string;
  /** Точка на полотне, в единицах SVG. */
  anchor: { x: number; y: number };
};

/**
 * Три выноски, которые есть у любого плетения.
 *
 * Точки взяты с реальной сетки: 16 нитей по ширине, шаг нити 30 единиц.
 */
const BASE_CALLOUTS: readonly Callout[] = [
  {
    id: "warp",
    label: "Основа",
    note: "Вертикальные нити: они держат полотно и отвечают за его прочность.",
    anchor: { x: 105, y: 114 },
  },
  {
    id: "weft",
    label: "Уток",
    note: "Горизонтальные нити: они проходят через основу и создают переплетение.",
    anchor: { x: 108, y: 165 },
  },
  {
    id: "edge",
    label: "Кромка",
    note: "Край полотна: здесь нити уходят в кромку. Без обработки нить по краю может сойти.",
    anchor: { x: 12, y: 150 },
  },
];

/** Выноска, которая есть только у своего вида плетения. */
const EXTRA_CALLOUT: Partial<Record<WeaveKind, Callout>> = {
  satin: {
    id: "float",
    label: "Долевая нить",
    note: "Основа ложится длинной долей и почти не переплетается: отсюда гладкость и блеск.",
    anchor: { x: 75, y: 150 },
  },
  twill: {
    id: "diagonal",
    label: "Косая 45°",
    note: "Саржа сдвигает переплетение на нить в каждом ряду, поэтому узор идёт по диагонали.",
    anchor: { x: 120, y: 135 },
  },
  velvet: {
    id: "nap",
    label: "Ворс",
    note: "Утку скрывает ворс: нити основы поднимаются и держат мягкий покров.",
    anchor: { x: 75, y: 150 },
  },
};

/** Выноски для вида плетения: три общие и одна своя. */
function calloutsFor(kind: WeaveKind): Callout[] {
  const extra = EXTRA_CALLOUT[kind];
  return extra ? [...BASE_CALLOUTS, extra] : [...BASE_CALLOUTS];
}

/** Деления линейки: значения масштаба и доля хода ползунка. */
const RULER_TICKS = [1, 1.5, 2, 2.5, 3].map((value) => ({
  value,
  /** Доля хода ползунка: 0 — левый край, 1 — правый. */
  part: (value - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN),
  major: Number.isInteger(value),
}));

/**
 * Положение точки полотна на плите при текущем увеличении.
 *
 * Полотно увеличивается от левого края и от середины по высоте: так кромка
 * не уходит из поля зрения, а точки выносок остаются на своих местах.
 */
function anchorOnPlate(anchor: { x: number; y: number }, zoom: number): { x: number; y: number } {
  const middle = CLOTH.height / 2;
  return {
    x: CLOTH_X + anchor.x * zoom,
    y: CLOTH_Y + middle + (anchor.y - middle) * zoom,
  };
}

export function WeaveFigure({ name, composition }: { name: string; composition: string }) {
  const kind = classifyWeave({ name, composition });
  const colors = weaveColors[kind];
  const [active, setActive] = useState<string | null>(null);
  const [zoom, setZoom] = useState(ZOOM_MIN);

  const callouts = calloutsFor(kind);

  const svg = renderWeaveSvg(kind, {
    width: CLOTH.width,
    height: CLOTH.height,
    warp: colors.warp,
    weft: colors.weft,
    threads: THREADS,
  });

  return (
    <figure className="weave-figure" data-active={active ?? undefined}>
      <div className="weave-plate" style={{ aspectRatio: `${PLATE.width} / ${PLATE.height}` }}>
        {/* Полотно: при увеличении его обрезает край рамки, а не тянет. */}
        <div
          className="weave-cloth"
          style={{
            left: `${(CLOTH_X / PLATE.width) * 100}%`,
            top: `${(CLOTH_Y / PLATE.height) * 100}%`,
            width: `${(CLOTH.width / PLATE.width) * 100}%`,
            height: `${(CLOTH.height / PLATE.height) * 100}%`,
          }}
        >
          <div className="weave-cloth-zoom" style={{ transform: `scale(${zoom})` }}>
            <div className="weave-cloth-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>

        {/* Выноски отдельным слоем поверх полотна: они должны быть настоящими элементами SVG. */}
        <svg
          className="weave-callouts"
          viewBox={`0 0 ${PLATE.width} ${PLATE.height}`}
          aria-hidden="true"
        >
          {callouts.map((callout, index) => {
            const row = LABEL_ROWS[index] ?? LABEL_ROWS[LABEL_ROWS.length - 1];
            const point = anchorOnPlate(callout.anchor, zoom);
            return (
              <g key={callout.id} className="weave-callout" data-callout={callout.id}>
                <path
                  className="weave-callout-line"
                  d={`M${RING_X + RING_R} ${row}L${point.x} ${point.y}`}
                />
                <circle className="weave-callout-dot" cx={point.x} cy={point.y} r="2.4" />
                <circle className="weave-callout-ring" cx={RING_X} cy={row} r={RING_R} />
                <text
                  className="weave-callout-number"
                  x={RING_X}
                  y={row}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {index + 1}
                </text>
                <text
                  className="weave-callout-text"
                  x={RING_X + RING_R + 6}
                  y={row}
                  dominantBaseline="central"
                >
                  {callout.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Линейка-масштаб: ползунок увеличивает полотно от 1× до 3×. */}
      <div className="weave-ruler">
        <div className="weave-ruler-track">
          <input
            type="range"
            className="weave-ruler-input"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Масштаб иллюстрации плетения"
            aria-valuetext={`Увеличение в ${zoom.toFixed(1)} раза`}
          />
          <div className="weave-ruler-scale" aria-hidden="true">
            {RULER_TICKS.map((tick) => (
              <span
                key={tick.value}
                className={
                  tick.major ? "weave-ruler-tick weave-ruler-tick--major" : "weave-ruler-tick"
                }
                style={{ left: `calc(${tick.part * 100}% + ${9 - 18 * tick.part}px)` }}
              >
                {tick.major && <span className="weave-ruler-number">{tick.value}×</span>}
              </span>
            ))}
          </div>
        </div>
        <p className="weave-ruler-value">×{zoom.toFixed(1)}</p>
      </div>

      <figcaption className="mt-2 font-latin text-sm italic text-ink-3">
        Табл. Плетение: {weaveLabels[kind]}
      </figcaption>

      <ul className="weave-legend">
        {callouts.map((callout, index) => (
          <li key={callout.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(callout.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(callout.id)}
              onBlur={() => setActive(null)}
              className="weave-legend-item"
            >
              <span className="weave-legend-number">{index + 1}</span>
              <span className="weave-legend-label">{callout.label}</span>
              <span className="weave-legend-note">{callout.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </figure>
  );
}
