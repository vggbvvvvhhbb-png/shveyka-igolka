"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import type { CatalogQuery } from "@/lib/pagination";

const sortOptions = [
  { value: "name", label: "По названию" },
  { value: "weight", label: "По весу" },
  { value: "difficulty", label: "По сложности" },
];

/**
 * Выбор сортировки каталога.
 *
 * Значение пишется в адресную строку, поэтому сортировку видно в ссылке
 * и она переживает перезагрузку страницы. Смена сортировки начинает
 * список заново — с первой страницы.
 */
export function SortSelect({ value, query }: { value: string; query: CatalogQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();

    for (const [key, item] of Object.entries(query)) {
      if (item) {
        params.set(key, item);
      }
    }

    params.set("sort", event.currentTarget.value);
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="catalog-sort" className="text-sm text-stone-500">
        Сортировка
      </label>
      <select
        id="catalog-sort"
        value={value}
        onChange={handleChange}
        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
