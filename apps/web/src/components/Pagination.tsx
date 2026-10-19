"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { buildPageHref, type CatalogQuery } from "@/lib/pagination";

type PaginationProps = {
  /** Номер текущей страницы, начиная с 1. */
  page: number;
  /** Сколько страниц всего. */
  totalPages: number;
  /** Фильтры каталога: переносятся из ссылки в ссылку. */
  query: CatalogQuery;
  /** Раздел каталога. */
  basePath?: string;
};

/**
 * Навигация по страницам каталога.
 *
 * Ссылки сохраняют текущие фильтры. Если фильтры изменились, номер
 * страницы сбрасывается на первый: иначе после смены фильтра человек
 * оказался бы на странице, которой для нового набора уже нет.
 */
export function Pagination({ page, totalPages, query, basePath = "/fabrics" }: PaginationProps) {
  const router = useRouter();

  const filtersSignature = JSON.stringify(query);
  const previousFilters = useRef(filtersSignature);

  useEffect(() => {
    if (previousFilters.current === filtersSignature) {
      return;
    }
    previousFilters.current = filtersSignature;

    if (page <= 1) {
      return;
    }

    router.replace(buildPageHref(basePath, query, 1), { scroll: false });
  }, [filtersSignature, page, basePath, query, router]);

  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const linkClass =
    "inline-flex items-center rounded-xl border border-stone-300 px-4 py-2 text-base text-stone-700 transition-colors hover:bg-stone-100";
  const disabledClass =
    "inline-flex items-center rounded-xl border border-stone-200 px-4 py-2 text-base text-stone-300";

  return (
    <nav aria-label="Постраничная навигация" className="flex items-center justify-between gap-4">
      {hasPrevious ? (
        <Link href={buildPageHref(basePath, query, page - 1)} className={linkClass}>
          ← Назад
        </Link>
      ) : (
        <span className={disabledClass}>← Назад</span>
      )}

      <span className="text-sm text-stone-500">
        Страница {page} из {totalPages}
      </span>

      {hasNext ? (
        <Link href={buildPageHref(basePath, query, page + 1)} className={linkClass}>
          Вперёд →
        </Link>
      ) : (
        <span className={disabledClass}>Вперёд →</span>
      )}
    </nav>
  );
}
