"use client";

import { useState } from "react";
import {
  calcProfit,
  DEFAULT_PROFIT_INPUT,
  monthStats,
  type ProfitInput,
  type ProjectEntry,
} from "@shveyka/core/calculator/profit";
import { btnCls, Card, Check, Field, inputCls, NumberField, PageShell } from "@/components/ui";
import { countPhrase, rub } from "@/lib/format";
import { useLocalStorage } from "@/lib/useLocalStorage";

export default function ProfitPage() {
  const [form, setForm] = useState<ProfitInput>(DEFAULT_PROFIT_INPUT);
  const [title, setTitle] = useState("");
  const [gift, setGift] = useState(false);
  const [history, setHistory] = useLocalStorage<ProjectEntry[]>("sewing:projects", []);

  const set = (k: keyof ProfitInput) => (v: number) => setForm((f) => ({ ...f, [k]: v }));

  const r = calcProfit(form);

  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleDateString("ru-RU", { month: "long" });
  const stats = monthStats(history, ym);

  function save() {
    if (r.cost <= 0) return;
    setHistory([
      {
        id: Date.now(),
        title: title.trim() || "Без названия",
        date: now.toISOString().slice(0, 10),
        gift,
        cost: Math.round(r.cost),
        shopPrice: form.shopPrice,
      },
      ...history,
    ]);
    setTitle("");
  }

  return (
    <PageShell
      title="Выгодно ли шить самой?"
      subtitle="Полная себестоимость против цены в магазине"
    >
      <Card title="Материалы">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Ткань" suffix="₽" value={form.fabric} onChange={set("fabric")} />
          <NumberField label="Подкладка" suffix="₽" value={form.lining} onChange={set("lining")} />
          <NumberField
            label="Фурнитура"
            suffix="₽"
            value={form.hardware}
            onChange={set("hardware")}
            hint="Пуговицы, молнии, резинки"
          />
          <NumberField
            label="Нитки"
            suffix="₽"
            value={form.thread}
            onChange={set("thread")}
            hint="Обычно 1–2 катушки"
          />
          <NumberField
            label="Дублирин или флизелин"
            suffix="₽"
            value={form.interfacing}
            onChange={set("interfacing")}
          />
        </div>
      </Card>

      <Card title="Время и затраты">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Время на пошив"
            suffix="часы"
            value={form.hours}
            onChange={set("hours")}
            step={0.5}
          />
          <NumberField
            label="Стоимость твоего часа"
            suffix="₽/час"
            value={form.hourlyRate}
            onChange={set("hourlyRate")}
            hint="0, если своё время не считаешь"
          />
          <NumberField
            label="Амортизация машинки или оверлока"
            suffix="₽/час"
            value={form.toolWearPerHour}
            onChange={set("toolWearPerHour")}
            hint="Например, 50"
          />
          <NumberField
            label="Электричество"
            suffix="₽/час"
            value={form.electricityPerHour}
            onChange={set("electricityPerHour")}
            hint="Примерно 10"
          />
          <NumberField
            label="Цена похожей вещи в магазине"
            suffix="₽"
            value={form.shopPrice}
            onChange={set("shopPrice")}
          />
        </div>
      </Card>

      <Card title="Результат" accent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-stone-600">Материалы</dt>
          <dd className="text-right">{rub(r.materials)}</dd>
          <dt className="text-stone-600">Твоё время</dt>
          <dd className="text-right">{rub(r.labor)}</dd>
          <dt className="text-stone-600">Инструменты</dt>
          <dd className="text-right">{rub(r.tools)}</dd>
          <dt className="text-stone-600">Электричество</dt>
          <dd className="text-right">{rub(r.electricity)}</dd>
          <dt className="font-semibold text-stone-900">Себестоимость</dt>
          <dd className="text-right font-semibold">{rub(r.cost)}</dd>
        </dl>
        <ul className="list-disc space-y-1 pl-5">
          {r.messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>

        <div className="space-y-3 border-t border-stone-200 pt-4">
          <Field label="Название проекта">
            <input
              className={inputCls}
              placeholder="Платье на день рождения"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Check label="Это подарок (не считать в экономию)" checked={gift} onChange={setGift} />
          <button className={btnCls} onClick={save} disabled={r.cost <= 0}>
            Сохранить в историю
          </button>
        </div>
      </Card>

      <Card title={`Статистика за ${monthName}`}>
        {stats.count === 0 ? (
          <p className="text-sm text-stone-600">Пока нет сохранённых проектов.</p>
        ) : (
          <p>
            За {monthName} ты сшила <b>{countPhrase(stats.count, ["вещь", "вещи", "вещей"])}</b>.
            {stats.savedTotal > 0 && (
              <>
                {" "}
                Сэкономила <b>{rub(stats.savedTotal)}</b>.
              </>
            )}
            {stats.giftCount > 0 && (
              <>
                {" "}
                Подарков: {countPhrase(stats.giftCount, ["подарок", "подарка", "подарков"])} на{" "}
                {rub(stats.giftSpent)}.
              </>
            )}
          </p>
        )}
      </Card>

      {history.length > 0 && (
        <Card title="История проектов">
          <ul className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-2">
                <span>
                  {h.gift ? "🎁 " : ""}
                  {h.title} · {h.date}
                </span>
                <span className="flex gap-3">
                  <span>
                    {rub(h.cost)}
                    {!h.gift && h.shopPrice > h.cost && (
                      <span className="text-emerald-700"> (−{rub(h.shopPrice - h.cost)})</span>
                    )}
                  </span>
                  <button
                    className="text-stone-500 underline"
                    onClick={() => setHistory(history.filter((x) => x.id !== h.id))}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}
