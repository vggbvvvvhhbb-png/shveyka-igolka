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
    <div className="max-w-xl space-y-4 rounded-plate border border-hair bg-paper-hi p-6">
      <h1 className="text-2xl font-bold text-ink">Что-то пошло не так</h1>
      <p className="text-ink-2">Не удалось загрузить каталог швов. Попробуйте ещё раз.</p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => reset()}
          className="rounded-plate bg-thread px-4 py-2 text-base text-paper-hi transition-colors hover:bg-thread-2"
        >
          Повторить
        </button>
        <Link
          href="/"
          className="rounded-plate border border-hair-2 px-4 py-2 text-base text-ink-2 transition-colors hover:bg-wash"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
