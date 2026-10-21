"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/fabrics", label: "Ткани" },
  { href: "/seams", label: "Швы" },
  { href: "/projects", label: "Проекты" },
  { href: "/measurements", label: "Мерки" },
];

/** Калькуляторы: расчёты, которые считаем на месте, без помощника. */
const calculatorItems = [
  { href: "/calculator", label: "Раскрой" },
  { href: "/profit", label: "Выгода" },
  { href: "/analog", label: "Аналог ткани" },
  { href: "/hardware", label: "Фурнитура" },
  { href: "/care", label: "Уход" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-stone-100 border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xl font-semibold text-stone-800 hover:text-stone-900 whitespace-nowrap"
          >
            🪡 Швейка
          </Link>

          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "px-3 py-2 rounded-lg text-base whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-stone-200 text-stone-900 font-medium"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 border-t border-stone-200 pt-3">
          <span className="shrink-0 text-sm text-stone-500">Калькуляторы</span>
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {calculatorItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-stone-800 text-white font-medium"
                      : "text-stone-700 hover:bg-stone-200",
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
