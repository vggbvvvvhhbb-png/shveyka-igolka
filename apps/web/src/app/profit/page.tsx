"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildMonthStats,
  isAlreadyStored,
  LEGACY_PROJECTS_KEY,
  parseSewnItems,
  parseStoredProjects,
  storedProjectToSewnInput,
  type SewnItem,
} from "@shveyka/core";
import {
  calcProfit,
  DEFAULT_PROFIT_INPUT,
  type ProfitInput,
} from "@shveyka/core/calculator/profit";
import { btnCls, Card, Check, Field, inputCls, NumberField, PageShell } from "@/components/ui";
import { countPhrase, rub } from "@/lib/format";

/** Ответ сервера на GET /api/sewn. */
interface SewnResponse {
  items: unknown[];
}

const MONTH_NAMES = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

export default function ProfitPage() {
  const [form, setForm] = useState<ProfitInput>(DEFAULT_PROFIT_INPUT);
  const [title, setTitle] = useState("");
  const [gift, setGift] = useState(false);
  const [items, setItems] = useState<SewnItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // id записи, для которой уже спросили подтверждение удаления.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const set = (k: keyof ProfitInput) => (v: number) => setForm((f) => ({ ...f, [k]: v }));

  const r = calcProfit(form);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthName = MONTH_NAMES[month];
  const stats = buildMonthStats(items, year, month);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/sewn");
    if (!res.ok) throw new Error("Не удалось загрузить журнал");
    const data = (await res.json()) as SewnResponse;
    const parsed = parseSewnItems(data.items);
    setItems(parsed);
    return parsed;
  }, []);

  /**
   * Перенос старой истории из браузера в журнал.
   *
   * Раньше калькулятор хранил проекты в localStorage: они были видны только
   * на этом устройстве. Теперь журнал общий для сайта и бота, поэтому старые
   * записи переносятся в него один раз. Ключ удаляется только после того,
   * как все записи приняты сервером, — иначе они потерялись бы.
   */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      let current: SewnItem[] = [];
      try {
        current = await loadItems();
      } catch {
        if (!cancelled) setError("Не удалось загрузить журнал");
        return;
      }

      let legacy: ReturnType<typeof parseStoredProjects> = [];
      try {
        legacy = parseStoredProjects(localStorage.getItem(LEGACY_PROJECTS_KEY));
      } catch {
        legacy = [];
      }
      if (legacy.length === 0) return;

      const known = current.map((item) => ({
        name: item.name,
        cost: item.cost,
        marketPrice: item.marketPrice,
        date: item.sewnAt.toISOString().slice(0, 10),
        gift: item.gift,
      }));

      const pending = legacy.filter((entry) => !isAlreadyStored(entry, known));
      if (pending.length === 0) {
        localStorage.removeItem(LEGACY_PROJECTS_KEY);
        return;
      }

      let saved = 0;
      for (const entry of pending) {
        try {
          const res = await fetch("/api/sewn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(storedProjectToSewnInput(entry)),
          });
          if (res.ok) {
            saved += 1;
            continue;
          }
          // Лимит запросов: остальные записи перенесутся при следующем открытии.
          if (res.status === 429) break;
        } catch {
          /* запись не перенеслась — попробуем при следующем открытии */
        }
      }

      if (cancelled) return;
      if (saved === pending.length) {
        // Всё перенесено — старые записи в браузере больше не нужны.
        localStorage.removeItem(LEGACY_PROJECTS_KEY);
        await loadItems();
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [loadItems]);

  async function save() {
    if (r.cost <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sewn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title.trim() || "Без названия",
          cost: Math.round(r.cost),
          marketPrice: form.shopPrice > 0 ? Math.round(form.shopPrice) : null,
          gift,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Не удалось сохранить");
      }
      setTitle("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    setConfirmingId(null);
    try {
      const res = await fetch(`/api/sewn/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить запись");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить запись");
    }
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
          <button className={btnCls} onClick={save} disabled={r.cost <= 0 || busy}>
            {busy ? "Сохраняю…" : "Сохранить в историю"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
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

      {items.length > 0 && (
        <Card title="История проектов">
          <ul className="space-y-1 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span>
                  {item.gift ? "🎁 " : ""}
                  {item.name} · {item.sewnAt.toISOString().slice(0, 10)}
                </span>
                <span className="flex gap-3">
                  <span>
                    {rub(item.cost)}
                    {!item.gift && item.marketPrice !== null && item.marketPrice > item.cost && (
                      <span className="text-emerald-700">
                        {" "}
                        (−{rub(item.marketPrice - item.cost)})
                      </span>
                    )}
                  </span>
                  <button
                    className="text-stone-500 underline"
                    onClick={() =>
                      confirmingId === item.id ? void remove(item.id) : setConfirmingId(item.id)
                    }
                    onBlur={() => setConfirmingId(null)}
                    aria-label={`Удалить ${item.name}`}
                  >
                    {confirmingId === item.id ? "Точно удалить?" : "×"}
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
