"use client";

/** Кнопка «Распечатать»: открывает печать браузера, сама на бумагу не попадает. */
export function PrintButton({ label = "Распечатать" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-stone-300 px-4 py-2 text-base text-stone-700 hover:border-stone-500 print:hidden"
    >
      {label}
    </button>
  );
}
