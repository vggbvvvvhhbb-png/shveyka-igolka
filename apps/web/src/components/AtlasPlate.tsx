"use client";

import Link from "next/link";
import { useState } from "react";
import { MACHINE_PARTS, WORK_MODE_HINTS, WORK_MODE_LABELS, WORK_MODES } from "@shveyka/core";
import { MachineFigure } from "@/components/MachineFigure";

/**
 * Плита главной — ряд B: три колонки вокруг рисунка машины.
 *
 * Слева — мелкие разделы справочника, в центре — таблица с рисунком, справа —
 * помощник и пояснение к выбранной детали. Выноска на рисунке и пояснение в
 * правой колонке связаны: состояние живёт здесь, в плите.
 */

/** Шаги «С чего начать» — по порядку, как в определителе. */
const startSteps = [
  "определитесь с изделием: шесть проектов каталога подскажут, с чего взять",
  "выберите ткань: в паспорте ткани есть плетение, настройки машины и уход",
  "откройте шов: у каждого шва — пошаговая инструкция и своя длина стежка",
  "настройте машину: игла, длина стежка, натяжение и лапка описаны для каждой ткани",
  "сделайте пробную строчку на обрезке: так видно, как ложится нить",
  "спросите помощника, если сомневаетесь: он отвечает по каталогу",
];

/** Калькуляторы: иконка в круге, название и одна строка. */
const calculators = [
  {
    href: "/calculator",
    title: "Раскрой",
    note: "Сколько метров ткани брать и какая ширина рулона выгоднее.",
    icon: "cut" as const,
  },
  {
    href: "/profit",
    title: "Выгода",
    note: "Своё изделие против цены в магазине: полная себестоимость.",
    icon: "balance" as const,
  },
  {
    href: "/analog",
    title: "Аналог ткани",
    note: "Подберём похожую ткань подешевле и покажем отличия.",
    icon: "swap" as const,
  },
  {
    href: "/hardware",
    title: "Фурнитура",
    note: "Список покупок: пуговицы, молнии, нитки и резинки.",
    icon: "button" as const,
  },
  {
    href: "/care",
    title: "Уход",
    note: "Инструкция по уходу по составу ткани — как на бирке.",
    icon: "iron" as const,
  },
];

/** Формат ответа помощника. */
const answerFormats = [
  { title: "Обычно", note: "Полный ответ с пояснениями." },
  { title: "Коротко", note: "Два-три предложения без списков." },
  { title: "По шагам", note: "Пронумерованный порядок действий." },
  { title: "Почему", note: "Объяснение выбранных настроек." },
];

/** Иконки калькуляторов: тонкие линии, как на всей плите. */
function CalcIcon({ name }: { name: (typeof calculators)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {name === "cut" && (
          <>
            <circle cx="6" cy="17.5" r="2.5" />
            <circle cx="18" cy="17.5" r="2.5" />
            <path d="M7.7 15.7 17 3.5M16.3 15.7 7 3.5" />
          </>
        )}
        {name === "balance" && (
          <>
            <path d="M12 5v15M6.5 20h11M3 9h18" />
            <path d="M3 9 1.6 13.6h2.8L3 9ZM21 9l-1.4 4.6h2.8L21 9Z" />
          </>
        )}
        {name === "swap" && (
          <>
            <rect x="3" y="4" width="8" height="8" rx="1" />
            <rect x="13" y="12" width="8" height="8" rx="1" />
            <path d="M6 12v4a1 1 0 0 0 1 1h6" />
            <path d="m11 15 2 2-2 2" />
          </>
        )}
        {name === "button" && (
          <>
            <circle cx="9" cy="12" r="6" />
            <path d="M7.4 10.4h.01M10.6 10.4h.01M7.4 13.6h.01M10.6 13.6h.01" />
            <path d="M14.5 10.5 21 4" />
            <path d="M13 9.5 14.5 11" />
          </>
        )}
        {name === "iron" && (
          <>
            <path d="M3 18h9l3-5a3 3 0 0 0-2.6-4.5H8.5L3 18Z" />
            <path d="M7.5 13.5h5" />
            <path d="M4.5 18v2h8" />
          </>
        )}
      </g>
    </svg>
  );
}

export function AtlasPlate() {
  const [active, setActive] = useState<string | null>(null);
  const [loupeEnabled, setLoupeEnabled] = useState(false);

  const part = MACHINE_PARTS.find((p) => p.id === active) ?? null;

  return (
    <div className="atlas-row">
      {/* ЛЕВАЯ КОЛОНКА */}
      <div className="atlas-col atlas-col--left">
        <section>
          <h2 className="plate-label drip mb-3">С чего начать</h2>
          <ol className="space-y-2">
            {startSteps.map((step, index) => (
              <li key={step} className="atlas-step">
                <span className="atlas-step__num">
                  {["Первое", "Второе", "Третье", "Четвёртое", "Пятое", "Шестое"][index]} —
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/start"
            className="stitch-link mt-3 inline-flex items-center gap-1 font-medium"
          >
            Подобрать проект, ткань и шов →
          </Link>
        </section>

        <section>
          <h2 className="plate-label drip mb-3">Калькуляторы</h2>
          <ul className="space-y-2">
            {calculators.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="atlas-calc">
                  <span className="atlas-calc__icon">
                    <CalcIcon name={item.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-title text-lg font-bold text-green">
                      {item.title}
                    </span>
                    <span className="block text-xs leading-relaxed text-ink-2">{item.note}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="plate-label drip mb-3">Из архива помощника</h2>
          <blockquote className="atlas-quote">
            <p className="font-title text-lg italic text-ink">
              Как шить джинсу на Brother LS-200s?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Джинса — плотный хлопок с саржевым переплетением. Берите джинсовую иглу 90/14, ставьте
              длину стежка 3–3,5 мм и натяжение 4–5.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Краситель линяет при первых стирках, а срезы сильно осыпаются — обрабатывайте их сразу
              после раскроя.
            </p>
          </blockquote>
        </section>
      </div>

      {/* ЦЕНТР */}
      <div className="atlas-col atlas-col--center">
        <div className="flex items-center justify-between gap-3">
          <h2 className="plate-label drip">Табл. I. Машина в разрезе</h2>
          <button
            type="button"
            className="atlas-loupe-btn"
            aria-pressed={loupeEnabled}
            onClick={() => setLoupeEnabled((value) => !value)}
          >
            Лупа
          </button>
        </div>

        <MachineFigure active={active} onActiveChange={setActive} loupeEnabled={loupeEnabled} />
      </div>

      {/* ПРАВАЯ КОЛОНКА */}
      <div className="atlas-col atlas-col--right">
        <section className="atlas-note" data-active={part ? "" : undefined}>
          {part ? (
            <>
              <p className="plate-label">Деталь {part.number}</p>
              <h3 className="font-title text-2xl font-bold text-green">{part.label}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{part.note}</p>
              <Link
                href={part.href}
                className="stitch-link mt-3 inline-flex items-center gap-1 font-medium"
              >
                Открыть раздел →
              </Link>
            </>
          ) : (
            <>
              <p className="plate-label">Восемь деталей</p>
              <p className="mt-2 leading-relaxed text-ink-3">
                Наведите курсор на выноску или выберите её с клавиатуры: деталь на рисунке
                подсветится, а здесь появится пояснение.
              </p>
            </>
          )}
        </section>

        <section>
          <h2 className="plate-label drip mb-2">Помощник Швейка</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            AI-консультант ответит на вопросы по шитью и поможет выбрать ткань по каталогу Швейки.
          </p>
          <Link
            href="/assistant"
            className="stitch-link mt-2 inline-flex items-center gap-1 font-medium"
          >
            Спросить →
          </Link>
        </section>

        <section>
          <h2 className="plate-label drip mb-2">Режимы</h2>
          <ul className="space-y-1.5">
            {WORK_MODES.map((mode) => (
              <li key={mode} className="atlas-mode">
                <span className="atlas-mode__name">{WORK_MODE_LABELS[mode]}</span>
                <span className="atlas-mode__note">{WORK_MODE_HINTS[mode]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="plate-label drip mb-2">Формат ответа</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {answerFormats.map((format) => (
              <li key={format.title} className="atlas-format" title={format.note}>
                {format.title}
              </li>
            ))}
          </ul>
        </section>

        <section className="atlas-caution">
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-bold text-ink">Важно.</span> Ответы опираются только на каталог
            Швейки.
          </p>
        </section>
      </div>
    </div>
  );
}
