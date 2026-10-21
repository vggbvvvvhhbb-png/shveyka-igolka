import type { ReactNode } from "react";

/**
 * Общие элементы интерфейса для калькуляторов.
 * Палитра — stone, как во всём Швейке.
 */

export const inputCls =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-800 outline-none focus:border-stone-500";

export const btnCls =
  "inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2 font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40";

export const btnGhostCls =
  "inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-2 text-stone-700 transition-colors hover:bg-stone-100";

/** Обёртка страницы: заголовок, пояснение и содержимое. */
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-stone-600">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

/** Карточка с блоком формы или результата. */
export function Card({
  title,
  children,
  accent,
}: {
  title?: string;
  children: ReactNode;
  /** Выделяет карточку: важное предупреждение или итог. */
  accent?: boolean;
}) {
  return (
    <section
      className={[
        "space-y-4 rounded-2xl border p-5",
        accent ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white",
      ].join(" ")}
    >
      {title && <h2 className="text-lg font-semibold text-stone-900">{title}</h2>}
      {children}
    </section>
  );
}

/** Поле формы с подписью и подсказкой. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

/** Поле с числовым значением. */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  hint?: string;
}) {
  return (
    <Field label={suffix ? `${label}, ${suffix}` : label} hint={hint}>
      <input
        type="number"
        inputMode="decimal"
        className={inputCls}
        value={Number.isNaN(value) ? "" : value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

/** Выбор из списка. */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Флажок. */
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      <input
        type="checkbox"
        className="h-4 w-4 accent-stone-900"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
