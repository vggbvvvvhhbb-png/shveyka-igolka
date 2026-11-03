"use client";

export default function MeasurementsError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-2xl space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold text-ink">Не удалось загрузить мерки</h1>
      <p className="text-ink-2">Попробуйте ещё раз — возможно, база данных занята.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-plate bg-thread px-5 py-2 text-paper-hi hover:bg-thread-2"
      >
        Повторить
      </button>
    </div>
  );
}
