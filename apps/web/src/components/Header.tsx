"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Шапка «Атласа».
 *
 * Римские цифры перед пунктами — номера таблиц определителя. Активный пункт
 * помечен зелёным и красным пунктирным стежком. При прокрутке строка
 * калькуляторов убирается, и шапка сжимается до одной строки.
 */

const navItems = [
  { href: "/", label: "Главная", numeral: "I" },
  { href: "/start", label: "С чего начать", numeral: "II" },
  { href: "/fabrics", label: "Ткани", numeral: "III" },
  { href: "/seams", label: "Швы", numeral: "IV" },
  { href: "/projects", label: "Проекты", numeral: "V" },
  { href: "/measurements", label: "Мерки", numeral: "VI" },
];

/** Калькуляторы: расчёты, которые считаем на месте, без помощника. */
const calculatorItems = [
  { href: "/calculator", label: "Раскрой" },
  { href: "/profit", label: "Выгода" },
  { href: "/analog", label: "Аналог ткани" },
  { href: "/hardware", label: "Фурнитура" },
  { href: "/care", label: "Уход" },
];

/** Игла с красной ниткой — знак сайта. */
function NeedleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true" fill="none">
      <path d="M18.5 5.5 6 18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M18.5 5.5 20 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 18 4.4 19.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M17.2 6.8c2.7.9 3.9 3 3.2 5.2-.6 2-2.7 3-4.4 2.3"
        stroke="var(--thread)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);

  // Шапка сжимается, когда страница прокручена.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-compact={compact} className="sticky top-0 z-30 border-b border-hair bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 text-green">
            <NeedleMark />
            <span className="font-title text-2xl font-bold">Швейка</span>
          </Link>

          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-baseline gap-1.5 whitespace-nowrap px-2 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                    isActive ? "stitch-link stitch-on text-green" : "text-ink-2 hover:text-green",
                  ].join(" ")}
                >
                  <span className="font-latin text-sm font-normal italic">{item.numeral}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="header-calculators mt-3 flex items-center gap-2 overflow-hidden border-t border-hair pt-3">
          <span className="shrink-0 font-latin text-sm italic text-ink-3">Калькуляторы:</span>
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {calculatorItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "whitespace-nowrap px-2 py-1 text-xs uppercase tracking-[0.1em] transition-colors",
                    isActive ? "text-thread" : "text-ink-3 hover:text-green",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
