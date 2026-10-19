type CardSkeletonVariant = "fabric" | "seam" | "project";

/**
 * Сколько строк текста показывает скелет в каждом варианте.
 * Число строк совпадает с длиной текста в настоящей карточке.
 */
const textLines: Record<CardSkeletonVariant, number> = {
  fabric: 3,
  seam: 2,
  project: 2,
};

/**
 * Скелет карточки каталога на время загрузки.
 *
 * Повторяет форму настоящей карточки: название, подпись, строки текста
 * и строку со сложностью. Покачивание задаёт animate-pulse.
 */
export function CardSkeleton({ variant = "fabric" }: { variant?: CardSkeletonVariant }) {
  const lines = textLines[variant];

  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-stone-200 bg-white p-5 animate-pulse"
    >
      <div className="h-5 w-3/4 rounded bg-stone-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-stone-100" />

      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`h-3 rounded bg-stone-100 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
          />
        ))}
      </div>

      <div className="mt-4 h-3 w-24 rounded bg-stone-100" />
    </div>
  );
}
