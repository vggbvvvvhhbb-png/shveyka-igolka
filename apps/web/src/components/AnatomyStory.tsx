"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MACHINE_PARTS,
  MACHINE_STEPS,
  MACHINE_THREAD_SEGMENT,
  MACHINE_VIEWBOX,
} from "@shveyka/core";
import { MachineSvg } from "@/components/MachineSvg";

/** Приближение камеры в скролл-истории. */
const CAMERA_SCALE = 1.7;

/**
 * Скролл-история «Анатомия».
 *
 * Слева липкий рисунок, справа — пояснение к текущей детали. Прокрутка
 * переводит камеру с одной детали на другую: рисунок наезжает, деталь
 * подсвечивается, а на пути нити горит только нужный отрезок.
 */
export function AnatomyStory() {
  const [index, setIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // Активный шаг считаем по прокрутке: так работает и без JS-анимаций.
  useEffect(() => {
    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      if (distance <= 0) return;
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const next = Math.min(MACHINE_STEPS.length - 1, Math.floor(progress * MACHINE_STEPS.length));
      setIndex(next);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const step = MACHINE_STEPS[index];
  const part = MACHINE_PARTS.find((p) => p.id === step.part);

  // Камера наезжает на деталь: точка детали встаёт в центр кадра.
  const cx = part?.anchor.x ?? MACHINE_VIEWBOX.width / 2;
  const cy = part?.anchor.y ?? MACHINE_VIEWBOX.height / 2;
  const camera = {
    tx: MACHINE_VIEWBOX.width / 2 - CAMERA_SCALE * cx,
    ty: MACHINE_VIEWBOX.height / 2 - CAMERA_SCALE * cy,
    scale: CAMERA_SCALE,
  };

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${MACHINE_STEPS.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 lg:grid-cols-2 lg:items-center">
          <div
            className="relative mx-auto w-full max-w-md"
            style={{
              aspectRatio: `${MACHINE_VIEWBOX.width} / ${MACHINE_VIEWBOX.height}`,
            }}
          >
            <MachineSvg
              className="absolute inset-0 h-full w-full"
              active={step.part}
              thread={MACHINE_THREAD_SEGMENT[step.part]}
              camera={camera}
            />
          </div>

          <div className="space-y-4">
            <p className="plate-label">Анатомия</p>
            <p className="text-sm text-ink-3">
              {index + 1} из {MACHINE_STEPS.length}
            </p>
            <h3 className="font-title text-3xl font-bold text-green">{step.title}</h3>
            <p className="max-w-md leading-relaxed text-ink-2">{step.text}</p>

            {index === MACHINE_STEPS.length - 1 && (
              <Link
                href="/fabrics"
                className="stitch-link inline-flex items-center gap-1 font-medium"
              >
                Перейти к каталогу тканей →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
