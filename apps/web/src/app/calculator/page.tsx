"use client";

import Link from "next/link";
import { useState } from "react";
import {
  calculateCutting,
  CUT_DIRECTION_LABELS,
  describeResult,
  GARMENT_LABELS,
  PATTERN_LABELS,
  ROLL_WIDTHS,
  type CutDirection,
  type GarmentType,
  type PatternType,
} from "@shveyka/core/calculator/cutting";
import {
  btnCls,
  btnGhostCls,
  Card,
  Check,
  inputCls,
  NumberField,
  PageShell,
  SelectField,
} from "@/components/ui";
import { aiUrl } from "@/lib/ai";
import { meters, rub } from "@/lib/format";
import { useLocalStorage } from "@/lib/useLocalStorage";

interface SavedCalc {
  id: number;
  title: string;
  date: string;
  lines: string[];
}

const garmentOptions = (Object.entries(GARMENT_LABELS) as [GarmentType, string][]).map(
  ([value, label]) => ({ value, label })
);

const directionOptions = (Object.entries(CUT_DIRECTION_LABELS) as [CutDirection, string][]).map(
  ([value, label]) => ({ value, label })
);

const patternOptions = (Object.entries(PATTERN_LABELS) as [PatternType, string][]).map(
  ([value, label]) => ({ value, label })
);

export default function CalculatorPage() {
  const [garment, setGarment] = useState<GarmentType>("dress");
  const [size, setSize] = useState(48);
  const [selected, setSelected] = useState<Record<number, boolean>>({
    140: true,
    220: true,
  });
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [direction, setDirection] = useState<CutDirection>("lengthwise");
  const [pattern, setPattern] = useState<PatternType>("none");
  const [seam, setSeam] = useState(1.5);
  const [shrink, setShrink] = useState(0);
  const [saved, setSaved] = useLocalStorage<SavedCalc[]>("sewing:calcs", []);
  const [shopMode, setShopMode] = useState<SavedCalc | null>(null);

  const widths = ROLL_WIDTHS.filter((w) => selected[w]).map((w) => ({
    widthCm: w,
    pricePerMeter: Number(prices[w]) > 0 ? Number(prices[w]) : undefined,
  }));

  const result =
    widths.length > 0
      ? calculateCutting({
          garment,
          size,
          widths,
          direction,
          pattern,
          seamAllowanceCm: seam,
          shrinkagePercent: shrink,
        })
      : null;

  const lines = result ? describeResult(result) : [];

  const aiPrompt = result
    ? `Я шью: ${GARMENT_LABELS[garment].toLowerCase()}, размер ${size}. ` +
      `Усадка ткани ${shrink}%, рисунок/ворс: ${pattern}. Калькулятор посчитал:\n` +
      lines.join("\n") +
      `\nПроверь расчёт и дай советы, сколько брать с запасом.`
    : "";

  function save() {
    if (!result) return;
    const item: SavedCalc = {
      id: Date.now(),
      title: `${GARMENT_LABELS[garment]}, размер ${size}`,
      date: new Date().toLocaleDateString("ru-RU"),
      lines,
    };
    setSaved([item, ...saved].slice(0, 30));
  }

  return (
    <PageShell
      title="Калькулятор раскроя"
      subtitle="Сколько метров брать и какая ширина рулона выгоднее"
    >
      <Card title="Что шьём">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Тип изделия"
            value={garment}
            onChange={setGarment}
            options={garmentOptions}
          />
          <NumberField
            label="Размер"
            value={size}
            onChange={setSize}
            min={40}
            step={1}
            hint="Обычно 44–56, можно ввести свой"
          />
          <SelectField
            label="Направление раскроя"
            value={direction}
            onChange={setDirection}
            options={directionOptions}
          />
          <SelectField
            label="Рисунок или ворс"
            value={pattern}
            onChange={setPattern}
            options={patternOptions}
          />
          <NumberField
            label="Припуск на швы"
            value={seam}
            onChange={setSeam}
            suffix="см"
            step={0.5}
          />
          <NumberField
            label="Усадка ткани"
            value={shrink}
            onChange={setShrink}
            suffix="%"
            hint="Например, хлопок даёт около 5%"
          />
        </div>
      </Card>

      <Card title="Ширина рулона и цена за метр">
        <div className="space-y-3">
          {ROLL_WIDTHS.map((w) => (
            <div key={w} className="flex items-center gap-3">
              <div className="w-24">
                <Check
                  label={`${w} см`}
                  checked={!!selected[w]}
                  onChange={(v) => setSelected({ ...selected, [w]: v })}
                />
              </div>
              <div className="flex-1">
                <input
                  className={inputCls}
                  inputMode="decimal"
                  placeholder="Цена за метр, ₽"
                  disabled={!selected[w]}
                  value={prices[w] ?? ""}
                  onChange={(e) => setPrices({ ...prices, [w]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500">Отметь несколько ширин, чтобы сравнить.</p>
      </Card>

      {result ? (
        <Card title="Результат" accent>
          <ul className="space-y-1">
            {result.results.map((r) => (
              <li key={r.widthCm}>
                Ширина <b>{r.widthCm} см</b>: нужно <b>{meters(r.meters)}</b>, отходы{" "}
                {r.wastePercent}%
                {r.total !== undefined && (
                  <>
                    {" "}
                    — <b>{rub(r.total)}</b>
                  </>
                )}
              </li>
            ))}
          </ul>

          {result.bestByCost && result.savings ? (
            <p className="rounded-xl bg-white p-3">
              Бери ширину <b>{result.bestByCost.widthCm} см</b> — сэкономишь{" "}
              <b>{rub(result.savings.rub)}</b> по сравнению с {result.savings.versusWidthCm} см.
            </p>
          ) : (
            <p className="text-sm text-stone-600">
              Меньше всего ткани уходит при ширине {result.bestByMeters.widthCm} см. Введи цены,
              чтобы сравнить стоимость.
            </p>
          )}

          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button className={btnCls} onClick={save}>
              Сохранить расчёт
            </button>
            <Link href={aiUrl(aiPrompt)} className={btnGhostCls}>
              Отправить в помощника
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm">Отметь хотя бы одну ширину рулона.</p>
        </Card>
      )}

      {saved.length > 0 && (
        <Card title="Сохранённые расчёты">
          <ul className="space-y-2">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {s.title} · {s.date}
                </span>
                <span className="flex gap-3">
                  <button className="text-stone-700 underline" onClick={() => setShopMode(s)}>
                    Показать в магазине
                  </button>
                  <button
                    className="text-stone-500 underline"
                    onClick={() => setSaved(saved.filter((x) => x.id !== s.id))}
                  >
                    Удалить
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {shopMode && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShopMode(null)}
        >
          <div className="max-w-md space-y-3 rounded-2xl bg-white p-6 text-xl">
            <h2 className="text-2xl font-semibold text-stone-900">{shopMode.title}</h2>
            {shopMode.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            <p className="text-sm text-stone-500">Нажми, чтобы закрыть</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
