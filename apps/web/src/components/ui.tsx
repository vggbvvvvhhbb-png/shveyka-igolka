import type { ReactNode } from "react";

/**
 * Общие элементы интерфейса.
 *
 * Палитра — «Атлас домашнего шитья»: молочная бумага, чернила, волосяные
 * линии и красная нить как единственный акцент. Крупные скругления и
 * белые «SaaS»-карточки убраны, поэтому радиус везде одинаковый, а блоки
 * разделяются тонкой линией, а не тенью.
 */

export const inputCls =
  "w-full rounded-plate border border-hair-2 bg-paper px-3 py-2 text-ink transition-colors focus:border-green";

export const btnCls =
  "inline-flex items-center justify-center rounded-plate bg-thread px-5 py-2 font-medium text-paper-hi transition-colors hover:bg-thread-2 disabled:opacity-40";

export const btnGhostCls =
  "inline-flex items-center justify-center rounded-plate border border-hair-2 px-5 py-2 text-ink-2 transition-colors hover:bg-wash";

/**
 * Обёртка страницы: заголовок таблицы, курсивная строка и содержимое.
 *
 * latin — необязательная подпись курсивом, как в старом определителе:
 * «Acus et Filum · Ars sartoria domestica».
 */
export function PageShell({
  title,
  subtitle,
  latin,
  children,
}: {
  title: string;
  subtitle?: string;
  latin?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b border-hair pb-6">
        <h1 className="text-4xl font-extrabold text-green md:text-5xl">{title}</h1>
        {latin && <p className="plate-latin">{latin}</p>}
        {subtitle && <p className="max-w-2xl text-ink-2">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

/**
 * Подпись раздела: капитель с разрядкой и оранжевой точкой-маркером.
 *
 * Точка «капает» при появлении — мелкая деталь, которая отличает живой
 * определитель от сухого списка.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={["plate-label drip", className].filter(Boolean).join(" ")}>{children}</h2>;
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
        "space-y-4 rounded-plate border p-5",
        accent ? "border-gold bg-gold-wash" : "border-hair bg-paper-hi",
      ].join(" ")}
    >
      {title && <h2 className="text-lg font-bold text-green">{title}</h2>}
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
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-3">{hint}</span>}
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
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <input
        type="checkbox"
        className="h-4 w-4 accent-gold"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
