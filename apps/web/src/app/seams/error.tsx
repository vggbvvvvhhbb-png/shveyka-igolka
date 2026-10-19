"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SeamsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-stone-900">Что-то пошло не так</h1>
      <p className="text-stone-600">Не удалось загрузить каталог швов. Попробуйте ещё раз.</p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-base text-white transition-colors hover:bg-stone-700"
        >
          Повторить
        </button>
        <Link
          href="/"
          className="rounded-xl border border-stone-300 px-4 py-2 text-base text-stone-700 transition-colors hover:bg-stone-100"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
