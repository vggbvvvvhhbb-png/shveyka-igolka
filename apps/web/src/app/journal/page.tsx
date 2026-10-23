import Link from "next/link";
import { buildYearStats } from "@shveyka/core";
import { getDbSingleton, queries } from "@shveyka/db";
import { DeleteButton } from "@/components/DeleteButton";
import { JournalForm } from "@/components/JournalForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Журнал шитья — Швейка",
  description: "Сколько вещей сшито за год, сколько потрачено и сэкономлено.",
};

const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const money = new Intl.NumberFormat("ru-RU");
const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });

/**
 * Журнал шитья: форма записи, итоги выбранного года и список вещей.
 * Год выбирается параметром ?y=, по умолчанию — текущий.
 */
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const { y } = await searchParams;
  const db = getDbSingleton();
  const [items, fabrics] = await Promise.all([
    queries.listSewnItems(db),
    queries.listFabricsForMatch(db),
  ]);

  const names = new Map(fabrics.map((fabric) => [fabric.id, fabric.name]));
  const currentYear = new Date().getUTCFullYear();
  const requested = Number(y);
  const year =
    Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : currentYear;

  const years = [
    ...new Set([currentYear, ...items.map((item) => item.sewnAt.getUTCFullYear())]),
  ].sort((a, b) => b - a);
  const stats = buildYearStats(items, year);
  const yearItems = items.filter((item) => item.sewnAt.getUTCFullYear() === year);
  const maxMonth = Math.max(1, ...stats.perMonth);

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "Сшито вещей", value: String(stats.count) },
    { label: "Потрачено", value: `${money.format(stats.totalCost)} ₽` },
    {
      label: "Сэкономлено",
      value: stats.pricedCount > 0 ? `${money.format(stats.totalSaved)} ₽` : "—",
      hint:
        stats.pricedCount > 0
          ? `по вещам с ценой в магазине: ${stats.pricedCount} из ${stats.count}`
          : "укажите цену в магазине, и здесь появится сумма",
    },
  ];
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-bold text-stone-900">Журнал шитья</h1>
        <nav aria-label="Год" className="flex flex-wrap gap-2 text-sm">
          {years.map((option) => (
            <Link
              key={option}
              href={`/journal?y=${option}`}
              className={`rounded-full px-3 py-1 ${
                option === year
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {option}
            </Link>
          ))}
        </nav>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="text-2xl font-semibold text-stone-900">{card.value}</p>
            {card.hint && <p className="mt-1 text-xs text-stone-500">{card.hint}</p>}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">По месяцам</h2>
        <div
          className="flex h-32 items-end gap-1"
          role="img"
          aria-label="Сколько вещей сшито в каждом месяце"
        >
          {stats.perMonth.map((count, month) => (
            <div
              key={MONTHS[month]}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-xs text-stone-500">{count > 0 ? count : ""}</span>
              <div
                className="w-full rounded-t bg-stone-700"
                style={{ height: `${(count / maxMonth) * 100}%`, minHeight: count > 0 ? 4 : 1 }}
              />
              <span className="text-xs text-stone-500">{MONTHS[month]}</span>
            </div>
          ))}
        </div>
        {stats.topFabrics.length > 0 && (
          <p className="text-stone-700">
            Чаще всего шила из:{" "}
            {stats.topFabrics.map((f) => `${names.get(f.slug) ?? f.slug} (${f.count})`).join(", ")}
          </p>
        )}
        {stats.giftCount > 0 && (
          <p className="text-stone-600">
            Подарков: {stats.giftCount} на {money.format(stats.giftSpent)} ₽ — в экономию они не
            входят.
          </p>
        )}
      </section>

      <JournalForm fabrics={fabrics.map((fabric) => ({ slug: fabric.id, name: fabric.name }))} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Вещи за {year}</h2>
        {yearItems.length === 0 ? (
          <p className="text-stone-600">За этот год записей нет.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {yearItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-stone-900">
                    {item.gift ? "🎁 " : ""}
                    {item.name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {dateFormat.format(item.sewnAt)}
                    {item.fabricSlug ? ` · ${names.get(item.fabricSlug) ?? item.fabricSlug}` : ""}
                    {` · ${money.format(item.cost)} ₽`}
                    {item.marketPrice !== null
                      ? ` (в магазине ${money.format(item.marketPrice)} ₽)`
                      : ""}
                  </p>
                </div>
                <DeleteButton endpoint={`/api/sewn/${item.id}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
