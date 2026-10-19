"use client";

export default function MeasurementsError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-2xl space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Не удалось загрузить мерки</h1>
      <p className="text-stone-600">Попробуйте ещё раз — возможно, база данных занята.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full bg-stone-900 px-5 py-2 text-white hover:bg-stone-700"
      >
        Повторить
      </button>
    </div>
  );
}
