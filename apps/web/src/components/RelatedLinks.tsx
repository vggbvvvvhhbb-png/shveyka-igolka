import Link from "next/link";
import type { LinkItem } from "@shveyka/core";

/**
 * Блок связей каталога: «с этой тканью шьют», «где применяется шов» и т.п.
 *
 * Пустой список — блока нет вовсе: пустой раздел только шумит.
 */
export function RelatedLinks({ title, items }: { title: string; items: readonly LinkItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={item.href}
              className="inline-block rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-100"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
