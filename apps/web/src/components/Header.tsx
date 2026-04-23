"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/fabrics", label: "Ткани" },
  { href: "/seams", label: "Швы" },
  { href: "/projects", label: "Проекты" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-stone-100 border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
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
    </header>
  );
}
