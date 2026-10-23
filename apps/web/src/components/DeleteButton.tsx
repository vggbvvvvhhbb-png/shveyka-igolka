"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Кнопка «Удалить» с подтверждением в два нажатия.
 * Отправляет DELETE на endpoint и обновляет страницу.
 */
export function DeleteButton({
  endpoint,
  label = "Удалить",
}: {
  endpoint: string;
  label?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Не удалось удалить");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2 print:hidden">
      <button
        type="button"
        disabled={busy}
        onClick={() => (confirming ? void remove() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className="text-sm text-stone-500 underline underline-offset-2 hover:text-red-700 disabled:opacity-40"
      >
        {confirming ? "Точно удалить?" : label}
      </button>
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
