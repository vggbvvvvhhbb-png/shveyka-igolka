"use client";

import { useState, type FormEvent } from "react";
import { MeasurementsSchema } from "@shveyka/core";

type Measurements = {
  bust?: number;
  waist?: number;
  hip?: number;
  height?: number;
};

type Field = { key: keyof Measurements; label: string; hint: string };

const fields: Field[] = [
  { key: "bust", label: "Обхват груди", hint: "в сантиметрах" },
  { key: "waist", label: "Обхват талии", hint: "в сантиметрах" },
  { key: "hip", label: "Обхват бёдер", hint: "в сантиметрах" },
  { key: "height", label: "Рост", hint: "в сантиметрах" },
];

/** Пустое поле отправляется как null — мерка не заполнена. */
function parseValue(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function MeasurementsForm({ initial }: { initial: Measurements }) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    bust: initial.bust?.toString() ?? "",
    waist: initial.waist?.toString() ?? "",
    hip: initial.hip?.toString() ?? "",
    height: initial.height?.toString() ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function onChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (status) setStatus(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const payload: Record<string, number> = {};
    for (const field of fields) {
      const value = parseValue(values[field.key] ?? "");
      if (value !== null) {
        payload[field.key] = value;
      }
    }

    // Проверяем на клиенте теми же правилами, что и сервер.
    const parsed = MeasurementsSchema.safeParse(payload);
    if (!parsed.success) {
      setStatus({ kind: "error", text: parsed.error.issues[0]?.message ?? "Проверьте значения" });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/measurements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Не удалось сохранить мерки, попробуйте позже");
      }

      setStatus({ kind: "ok", text: "Мерки сохранены" });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "Не удалось сохранить мерки, попробуйте позже",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label htmlFor={`measure-${field.key}`} className="block text-sm text-stone-700">
              {field.label}
            </label>
            <input
              id={`measure-${field.key}`}
              name={field.key}
              type="number"
              inputMode="numeric"
              step={1}
              min={30}
              max={250}
              placeholder={field.hint}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.currentTarget.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-base text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
        ))}
      </div>

      <p className="text-sm text-stone-500">
        Заполните столько мерок, сколько знаете. Пустые поля можно оставить — Швейка подставит их
        сама, когда спросите про проект.
      </p>

      {status && (
        <p
          role="status"
          className={status.kind === "ok" ? "text-sm text-stone-700" : "text-sm text-red-700"}
        >
          {status.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-stone-900 px-5 py-2 text-white disabled:opacity-40 hover:bg-stone-700"
      >
        {saving ? "Сохраняю…" : "Сохранить мерки"}
      </button>
    </form>
  );
}
