"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const categoryOptions = [
  { value: "", label: "Все категории" },
  { value: "natural", label: "Натуральные" },
  { value: "synthetic", label: "Синтетические" },
  { value: "blend", label: "Смесовые" },
];

const weightOptions = [
  { value: "", label: "Любой вес" },
  { value: "light", label: "Лёгкая" },
  { value: "medium", label: "Средняя" },
  { value: "heavy", label: "Тяжёлая" },
  { value: "very_heavy", label: "Очень тяжёлая" },
];

const stretchOptions = [
  { value: "", label: "Любая растяжимость" },
  { value: "none", label: "Нет" },
  { value: "low", label: "Низкая" },
  { value: "medium", label: "Средняя" },
  { value: "high", label: "Высокая" },
];

export function FabricFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const category = searchParams.get("category") ?? "";
  const weight = searchParams.get("weight") ?? "";
  const stretch = searchParams.get("stretch") ?? "";

  const hasFilters = Boolean(category || weight || stretch || q);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Debounced search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") ?? "";
      if (q !== currentQ) {
        updateParams({ q });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, searchParams, updateParams]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="flex-1 min-w-[12rem]">
        <label htmlFor="fabric-search" className="sr-only">
          Поиск по названию
        </label>
        <input
          id="fabric-search"
          type="search"
          value={q}
          onChange={(e) => setQ((e.currentTarget as unknown as HTMLInputElement).value)}
          placeholder="Найти ткань…"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-base text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={category}
          onChange={(e) => updateParams({ category: (e.currentTarget as unknown as HTMLSelectElement).value })}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
        >
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={weight}
          onChange={(e) => updateParams({ weight: (e.currentTarget as unknown as HTMLSelectElement).value })}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
        >
          {weightOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={stretch}
          onChange={(e) => updateParams({ stretch: (e.currentTarget as unknown as HTMLSelectElement).value })}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
        >
          {stretchOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            router.replace(pathname, { scroll: false });
          }}
          className="rounded-xl border border-stone-300 px-4 py-2 text-base text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}
