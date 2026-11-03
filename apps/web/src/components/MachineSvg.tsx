"use client";

import { MACHINE_DEFS, MACHINE_SHAPES, MACHINE_STYLE, MACHINE_VIEWBOX } from "@shveyka/core";

/**
 * Рисунок машины.
 *
 * Разметка деталей приходит из ядра строкой, но группы собирает React: так
 * активную деталь можно пометить прямо в разметке, и схема сама подсветит
 * её — правила подсветки лежат в стилях самой схемы.
 */
export function MachineSvg({
  active,
  thread,
  camera,
  className,
  label = "Швейная машина в разрезе-схеме",
}: {
  /** Подсвечиваемая деталь. */
  active?: string | null;
  /** Подсвечиваемый отрезок нити: 1…5. */
  thread?: number | null;
  /** Камера: сдвиг и приближение рисунка. */
  camera?: { tx: number; ty: number; scale: number };
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${MACHINE_VIEWBOX.width} ${MACHINE_VIEWBOX.height}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <defs dangerouslySetInnerHTML={{ __html: MACHINE_DEFS }} />
      <style dangerouslySetInnerHTML={{ __html: MACHINE_STYLE }} />
      <g
        className={camera ? "machine-camera" : undefined}
        style={
          camera
            ? {
                transform: `translate(${camera.tx}px, ${camera.ty}px) scale(${camera.scale})`,
                transformOrigin: "0 0",
                transformBox: "view-box",
              }
            : undefined
        }
      >
        {MACHINE_SHAPES.map((shape) => {
          const isActive = active === shape.id;
          const isThread = thread != null && shape.id === `thread-${thread}`;
          return (
            <g
              key={shape.id}
              data-part={shape.id}
              data-part-active={isActive || isThread ? "" : undefined}
              dangerouslySetInnerHTML={{ __html: shape.markup }}
            />
          );
        })}
      </g>
    </svg>
  );
}
