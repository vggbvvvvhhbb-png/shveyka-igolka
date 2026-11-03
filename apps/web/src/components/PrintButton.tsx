"use client";

/** Кнопка «Распечатать»: открывает печать браузера, сама на бумагу не попадает. */
export function PrintButton({ label = "Распечатать" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-plate border border-hair-2 px-4 py-2 text-base text-ink-2 hover:border-green print:hidden"
    >
      {label}
    </button>
  );
}
