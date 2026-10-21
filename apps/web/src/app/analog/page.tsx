"use client";

import Link from "next/link";
import { useState } from "react";
import { findAnalogs, type AnalogItem } from "@shveyka/core/calculator/analog";
import {
  DENSITY_LABELS,
  FABRIC_OPTIONS,
  PURPOSE_LABELS,
  SEASON_LABELS,
  TRAIT_LABELS,
  type Density,
  type Purpose,
  type Season,
  type Trait,
} from "@shveyka/core/calculator/fabrics";
import {
  btnGhostCls,
  Card,
  Check,
  Field,
  inputCls,
  NumberField,
  PageShell,
  SelectField,
} from "@/components/ui";
import { aiUrl } from "@/lib/ai";
import { rub } from "@/lib/format";
import { useLocalStorage } from "@/lib/useLocalStorage";

const purposeOptions = (Object.entries(PURPOSE_LABELS) as [Purpose, string][]).map(
  ([value, label]) => ({ value, label })
);

const seasonOptions = (Object.entries(SEASON_LABELS) as [Season, string][]).map(
  ([value, label]) => ({ value, label })
);

const densityOptions = (Object.entries(DENSITY_LABELS) as [Density, string][]).map(
  ([value, label]) => ({ value, label })
);

export default function AnalogPage() {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("dress");
  const [season, setSeason] = useState<Season>("summer");
  const [density, setDensity] = useState<Density>("light");
  const [price, setPrice] = useState(0);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [onlyCheaper, setOnlyCheaper] = useState(true);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [reviews, setReviews] = useLocalStorage<Record<string, string>>(
    "sewing:fabric-reviews",
    {}
  );

  const res = findAnalogs({
    name: name || undefined,
    purpose,
    season,
    density,
    pricePerMeter: price > 0 ? price : undefined,
    traits,
    onlyCheaper,
  });

  const compare: AnalogItem | undefined = res.analogs.find((a) => a.fabric.id === compareId);

  const toggleTrait = (t: Trait) =>
    setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const aiPrompt =
    `Хочу купить ткань${name ? ` «${name}»` : ""} ${price ? `за ${price} ₽/м ` : ""}` +
    `для: ${PURPOSE_LABELS[purpose].toLowerCase()}, сезон: ${SEASON_LABELS[season].toLowerCase()}. ` +
    `Подбери дешевле аналоги и объясни, чем они отличаются.`;

  return (
    <PageShell title="Подбор аналога ткани" subtitle="Найдём похожую ткань подешевле">
      <Card title="Какую ткань хочешь заменить">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название (если знаешь)" hint="Например: лён, вискоза, драп">
            <input
              className={inputCls}
              list="fabric-names"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <datalist id="fabric-names">
              {FABRIC_OPTIONS.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </Field>
          <NumberField label="Цена за метр" suffix="₽" value={price} onChange={setPrice} />
          <SelectField
            label="Назначение"
            value={purpose}
            onChange={setPurpose}
            options={purposeOptions}
          />
          <SelectField label="Сезон" value={season} onChange={setSeason} options={seasonOptions} />
          <SelectField
            label="Плотность"
            value={density}
            onChange={setDensity}
            options={densityOptions}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Нужные свойства</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(Object.keys(TRAIT_LABELS) as Trait[]).map((t) => (
              <Check
                key={t}
                label={TRAIT_LABELS[t]}
                checked={traits.includes(t)}
                onChange={() => toggleTrait(t)}
              />
            ))}
          </div>
        </div>
        <Check
          label="Показывать только дешевле моей ткани"
          checked={onlyCheaper}
          onChange={setOnlyCheaper}
        />
      </Card>

      {res.warnings.map((w) => (
        <Card key={w} accent>
          <p>⚠️ {w}</p>
        </Card>
      ))}

      <Card title={`Найдено вариантов: ${res.analogs.length}`}>
        {res.analogs.length === 0 && (
          <p className="text-sm text-stone-600">
            Ничего не нашлось. Попробуй убрать часть свойств или отключить «только дешевле».
          </p>
        )}
        <ul className="space-y-3">
          {res.analogs.map((a) => (
            <li key={a.fabric.id} className="space-y-2 rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <b className="text-stone-900">{a.fabric.name}</b>
                <span>
                  {rub(a.fabric.price)}/м
                  {a.savingsPerMeter > 0 && (
                    <span className="text-emerald-700">
                      {" "}
                      (−{rub(a.savingsPerMeter)}, −{a.savingsPercent}%)
                    </span>
                  )}
                </span>
              </div>
              <p className="text-sm text-stone-600">{a.fabric.composition}</p>
              <p className="text-sm">
                👍 {a.fabric.pros}
                <br />
                👎 {a.fabric.cons}
              </p>
              {a.differences.length > 0 && (
                <p className="text-xs text-stone-500">{a.differences.join(" · ")}</p>
              )}
              {a.fabric.shop && <p className="text-xs">Где купить: {a.fabric.shop}</p>}
              <input
                className={inputCls}
                placeholder="Мой отзыв (например: хорошо стирается)"
                value={reviews[a.fabric.id] ?? ""}
                onChange={(e) => setReviews({ ...reviews, [a.fabric.id]: e.target.value })}
              />
              <button
                className="text-sm text-stone-700 underline"
                onClick={() => setCompareId(a.fabric.id)}
              >
                Сравнить бок о бок
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {compare && (
        <Card title="Сравнение бок о бок">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="py-1 pr-2" />
                  <th className="py-1 pr-2">{res.original?.name ?? (name || "Твоя ткань")}</th>
                  <th className="py-1">{compare.fabric.name}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Состав", res.original?.composition ?? "—", compare.fabric.composition],
                    [
                      "Цена",
                      price
                        ? `${rub(price)}/м`
                        : res.original
                          ? `${rub(res.original.price)}/м`
                          : "—",
                      `${rub(compare.fabric.price)}/м`,
                    ],
                    [
                      "Плотность",
                      DENSITY_LABELS[res.original?.density ?? density],
                      DENSITY_LABELS[compare.fabric.density],
                    ],
                    [
                      "Ширина",
                      res.original ? `${res.original.widthCm} см` : "—",
                      `${compare.fabric.widthCm} см`,
                    ],
                    [
                      "Свойства",
                      res.original?.traits.map((t) => TRAIT_LABELS[t]).join(", ") || "—",
                      compare.fabric.traits.map((t) => TRAIT_LABELS[t]).join(", ") || "—",
                    ],
                  ] as const
                ).map(([label, left, right]) => (
                  <tr key={label} className="border-b border-stone-100 align-top">
                    <td className="py-1 pr-2 font-medium">{label}</td>
                    <td className="py-1 pr-2">{left}</td>
                    <td className="py-1">{right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Link href={aiUrl(aiPrompt)} className={btnGhostCls}>
        Описать ткань словами — спросить помощника
      </Link>
    </PageShell>
  );
}
