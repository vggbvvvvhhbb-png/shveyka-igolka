"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MACHINE_DEFS,
  MACHINE_PARTS,
  MACHINE_SHAPES,
  MACHINE_STYLE,
  MACHINE_VIEWBOX,
} from "@shveyka/core";
import { MachineSvg } from "@/components/MachineSvg";

/** Диаметр лупы в пикселях. */
const LOUPE_SIZE = 160;
/** Во сколько раз лупа увеличивает рисунок. */
const LOUPE_SCALE = 2.4;
/** Сколько единиц схемы помещается в окно лупы. */
const LOUPE_VIEW = {
  width: LOUPE_SIZE / LOUPE_SCALE,
  height: LOUPE_SIZE / LOUPE_SCALE,
};
/** За сколько миллисекунд два касания считаются двойным. */
const DOUBLE_TAP_MS = 320;
/** На сколько пикселей касания могут разойтись и всё же считаться двойным. */
const DOUBLE_TAP_PX = 28;

/** Точка под курсором: координаты окна и координаты внутри схемы. */
type LoupePoint = {
  /** Положение на экране. */
  x: number;
  y: number;
  /** Координата в единицах viewBox. */
  vx: number;
  vy: number;
};

/**
 * Рисунок машины с выносками.
 *
 * Выноска — настоящая ссылка. Наводишь курсор, и деталь на рисунке
 * подкрашивается золотом, остальные приглушаются, а в правой колонке плиты
 * появляется пояснение. С клавиатуры работает так же: Tab — фокус на выноске,
 * Enter — переход.
 *
 * Лупа — инструмент «оптика»: включается кнопкой или удержанием пробела,
 * следует за курсором и показывает рисунок крупно в латунной оправе.
 */
export function MachineFigure({
  active,
  onActiveChange,
  loupeEnabled,
}: {
  /** Подсвечиваемая деталь. */
  active: string | null;
  /** Сообщает плите, какая деталь выбрана: там живёт пояснение. */
  onActiveChange: (id: string | null) => void;
  /** Включена ли лупа кнопкой. */
  loupeEnabled: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [loupe, setLoupe] = useState<LoupePoint | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const hoveringRef = useRef(false);
  const tapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  /** Пробел держим только пока курсор над рисунком. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !hoveringRef.current) return;
      event.preventDefault();
      setSpaceHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  /** Переводит координаты указателя в единицы схемы. */
  const toUser = useCallback((clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      vx: ((clientX - rect.left) / rect.width) * MACHINE_VIEWBOX.width,
      vy: ((clientY - rect.top) / rect.height) * MACHINE_VIEWBOX.height,
    };
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      hoveringRef.current = true;
      if (!loupeEnabled && !spaceHeld) return;
      if (event.pointerType !== "mouse") return;
      const point = toUser(event.clientX, event.clientY);
      if (!point) return;
      setLoupe({ x: event.clientX, y: event.clientY, vx: point.vx, vy: point.vy });
    },
    [loupeEnabled, spaceHeld, toUser]
  );

  const onPointerLeave = useCallback(() => {
    hoveringRef.current = false;
    setLoupe(null);
  }, []);

  /** Двойной тап на тач-экране: увеличиваем деталь в центре рисунка. */
  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") return;
      const now = Date.now();
      const prev = tapRef.current;
      tapRef.current = { t: now, x: event.clientX, y: event.clientY };
      if (
        !prev ||
        now - prev.t > DOUBLE_TAP_MS ||
        Math.abs(event.clientX - prev.x) > DOUBLE_TAP_PX ||
        Math.abs(event.clientY - prev.y) > DOUBLE_TAP_PX
      ) {
        return;
      }
      const point = toUser(event.clientX, event.clientY);
      const frame = frameRef.current;
      if (!point || !frame) return;
      const rect = frame.getBoundingClientRect();
      setLoupe({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        vx: point.vx,
        vy: point.vy,
      });
      tapRef.current = null;
    },
    [toUser]
  );

  return (
    <figure className="machine-figure" data-active={active ?? undefined}>
      <div
        ref={frameRef}
        className="relative w-full"
        style={{ aspectRatio: `${MACHINE_VIEWBOX.width} / ${MACHINE_VIEWBOX.height}` }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerUp={onPointerUp}
      >
        <MachineSvg className="absolute inset-0 h-full w-full" active={active} />

        {/* Выноски отдельным слоем поверх рисунка: они должны быть ссылками. */}
        <svg
          viewBox={`0 0 ${MACHINE_VIEWBOX.width} ${MACHINE_VIEWBOX.height}`}
          className="machine-callouts absolute inset-0 h-full w-full"
        >
          {MACHINE_PARTS.map((part) => {
            const endX = part.side === "left" ? part.labelPoint.x + 6 : part.labelPoint.x - 6;
            const textX = part.side === "left" ? part.labelPoint.x - 11 : part.labelPoint.x + 11;

            return (
              <Link
                key={part.id}
                href={part.href}
                aria-label={part.label}
                className="machine-callout"
                data-callout-active={active === part.id ? "" : undefined}
                onMouseEnter={() => onActiveChange(part.id)}
                onMouseLeave={() => onActiveChange(null)}
                onFocus={() => onActiveChange(part.id)}
                onBlur={() => onActiveChange(null)}
              >
                <path
                  className="machine-callout-line"
                  d={`M${part.anchor.x} ${part.anchor.y}L${endX} ${part.labelPoint.y}`}
                />
                <circle
                  className="machine-callout-dot"
                  cx={part.anchor.x}
                  cy={part.anchor.y}
                  r="2.6"
                />
                <circle
                  className="machine-callout-ring"
                  cx={part.labelPoint.x}
                  cy={part.labelPoint.y}
                  r="7"
                />
                <text
                  className="machine-callout-number"
                  x={part.labelPoint.x}
                  y={part.labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {part.number}
                </text>
                <text
                  className="machine-callout-text"
                  x={textX}
                  y={part.labelPoint.y}
                  textAnchor={part.side === "left" ? "end" : "start"}
                  dominantBaseline="central"
                >
                  {part.short}
                </text>
              </Link>
            );
          })}
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-latin text-sm italic text-ink-3">
          Табл. I. Швейная машина в разрезе-схеме
        </span>
        <span className="font-latin text-xs italic text-ink-3">
          Лупа: кнопка или удержание пробела
        </span>
      </figcaption>

      {/* Лупа следует за курсором и показывает рисунок крупно. */}
      {loupe && (
        <div
          className="machine-loupe"
          style={{ left: `${loupe.x}px`, top: `${loupe.y}px` }}
          aria-hidden="true"
        >
          {/* Окно схемы под курсором: viewBox вместо трансформации — так
              увеличение остаётся точным на любом масштабе рисунка. */}
          <svg
            viewBox={`${loupe.vx - LOUPE_VIEW.width / 2} ${loupe.vy - LOUPE_VIEW.height / 2} ${
              LOUPE_VIEW.width
            } ${LOUPE_VIEW.height}`}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
          >
            <defs dangerouslySetInnerHTML={{ __html: MACHINE_DEFS }} />
            <style dangerouslySetInnerHTML={{ __html: MACHINE_STYLE }} />
            <rect
              className="machine-loupe__paper"
              x={loupe.vx - LOUPE_VIEW.width / 2}
              y={loupe.vy - LOUPE_VIEW.height / 2}
              width={LOUPE_VIEW.width}
              height={LOUPE_VIEW.height}
            />
            {MACHINE_SHAPES.map((shape) => (
              <g key={shape.id} dangerouslySetInnerHTML={{ __html: shape.markup }} />
            ))}
          </svg>
        </div>
      )}
    </figure>
  );
}
