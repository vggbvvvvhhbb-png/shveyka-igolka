"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const field =
  "w-full rounded-xl border border-stone-300 bg-white p-2 text-stone-800 focus:outline-none focus:border-stone-500";

/** Форма «Я сшила»: название, затраты, цена в магазине, ткань. */
export function JournalForm({ fabrics }: { fabrics: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const number = (key: string): number | null => {
      const raw = String(data.get(key) ?? "").trim();
      return raw === "" ? null : Number(raw);
    };

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sewn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          cost: number("cost"),
          marketPrice: number("marketPrice"),
          fabricSlug: String(data.get("fabricSlug") ?? "") || null,
          gift: data.get("gift") === "1",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Не удалось сохранить");
      }
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4"
    >
      <h2 className="text-xl font-semibold text-stone-900">Я сшила</h2>
      <label className="block space-y-1 text-stone-600">
        Что именно
        <input name="name" required maxLength={80} placeholder="Платье из льна" className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-stone-600">
          Затраты, ₽
          <input
            name="cost"
            required
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={field}
          />
        </label>
        <label className="block space-y-1 text-stone-600">
          Сколько стоит такое в магазине, ₽
          <input
            name="marketPrice"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={field}
          />
        </label>
      </div>
      <label className="block space-y-1 text-stone-600">
        Ткань
        <select name="fabricSlug" defaultValue="" className={field}>
          <option value="">Не указана</option>
          {fabrics.map((fabric) => (
            <option key={fabric.slug} value={fabric.slug}>
              {fabric.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-stone-600">
        <input type="checkbox" name="gift" value="1" />
        Это подарок — в экономию не считать
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-stone-900 px-5 py-2 text-white disabled:opacity-40 hover:bg-stone-700"
      >
        {busy ? "Сохраняю…" : "Записать"}
      </button>
    </form>
  );
}
