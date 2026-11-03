"use client";

import { useLocalStorage } from "@/lib/useLocalStorage";
import { PrintButton } from "@/components/PrintButton";

/**
 * Чек-лист проекта с отметками. Отмеченные пункты хранятся в браузере по
 * тексту пункта, поэтому правка списка в каталоге не сдвигает чужие отметки.
 * В печатной версии пункты остаются с пустыми квадратиками, кнопки скрыты.
 */
export function ProjectChecklist({ slug, items }: { slug: string; items: string[] }) {
  const [checked, setChecked, loaded] = useLocalStorage<string[]>(`checklist:${slug}`, []);
  const done = items.filter((item) => checked.includes(item)).length;

  function toggle(item: string) {
    setChecked((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-ink">Чек-лист</h2>
        <span className="text-sm text-ink-3 print:hidden">
          {loaded ? `Отмечено ${done} из ${items.length}` : ""}
        </span>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const isDone = loaded && checked.includes(item);
          return (
            <li key={item}>
              <label className="flex cursor-pointer items-start gap-3 text-ink-2 leading-relaxed">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(item)}
                  className="mt-1 h-5 w-5 shrink-0 accent-thread"
                />
                <span
                  className={
                    isDone ? "text-ink-3 line-through print:text-ink-2 print:no-underline" : ""
                  }
                >
                  {item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 print:hidden">
        <PrintButton label="Распечатать чек-лист" />
        {done > 0 && (
          <button
            type="button"
            onClick={() => setChecked([])}
            className="rounded-plate px-4 py-2 text-base text-ink-2 hover:text-ink"
          >
            Сбросить отметки
          </button>
        )}
      </div>
    </section>
  );
}
