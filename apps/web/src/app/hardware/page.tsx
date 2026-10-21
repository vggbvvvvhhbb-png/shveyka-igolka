"use client";

import { useState } from "react";
import {
  buildHardware,
  CLOSURE_LABELS,
  estimateTotal,
  HW_GARMENT_LABELS,
  shoppingText,
  type Closure,
  type HwGarment,
} from "@shveyka/core/calculator/hardware";
import {
  btnCls,
  Card,
  Check,
  Field,
  inputCls,
  NumberField,
  PageShell,
  SelectField,
} from "@/components/ui";
import { rub } from "@/lib/format";
import { useLocalStorage } from "@/lib/useLocalStorage";

const garmentOptions = (Object.entries(HW_GARMENT_LABELS) as [HwGarment, string][]).map(
  ([value, label]) => ({ value, label })
);

const closureOptions = (Object.entries(CLOSURE_LABELS) as [Closure, string][]).map(
  ([value, label]) => ({ value, label })
);

export default function HardwarePage() {
  const [garment, setGarment] = useState<HwGarment>("dress");
  const [size, setSize] = useState(48);
  const [closure, setClosure] = useState<Closure>("zipper");
  const [longSleeve, setLongSleeve] = useState(true);
  const [collar, setCollar] = useState(false);
  const [pockets, setPockets] = useState(0);
  const [hood, setHood] = useState(false);
  const [elasticWaist, setElasticWaist] = useState(false);
  const [elasticCuffs, setElasticCuffs] = useState(false);
  const [overlock, setOverlock] = useState(true);
  const [contrast, setContrast] = useState(false);
  const [color, setColor] = useState("");
  const [have, setHave] = useLocalStorage<string[]>("sewing:hardware-have", []);
  const [copied, setCopied] = useState(false);

  const items = buildHardware({
    garment,
    size,
    closure,
    longSleeve,
    collar,
    pockets,
    hood,
    elasticWaist,
    elasticCuffs,
    overlock,
    contrastTopstitch: contrast,
    fabricColor: color,
  });
  const [lo, hi] = estimateTotal(items, have);
  const text = shoppingText(items, have);

  const toggleHave = (id: string) =>
    setHave(have.includes(id) ? have.filter((x) => x !== id) : [...have, id]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер обмена недоступен */
    }
  }

  return (
    <PageShell
      title="Сколько нужно фурнитуры"
      subtitle="Список покупок, чтобы не бегать в магазин дважды"
    >
      <Card title="Что шьём">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Тип изделия"
            value={garment}
            onChange={setGarment}
            options={garmentOptions}
          />
          <NumberField label="Размер" value={size} onChange={setSize} min={40} />
          <SelectField
            label="Тип застёжки"
            value={closure}
            onChange={setClosure}
            options={closureOptions}
          />
          <Field label="Цвет ткани" hint="Подскажем нитки в тон">
            <input
              className={inputCls}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Например: изумрудный"
            />
          </Field>
          <NumberField label="Количество карманов" value={pockets} onChange={setPockets} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Check label="Длинный рукав" checked={longSleeve} onChange={setLongSleeve} />
          <Check label="Воротник" checked={collar} onChange={setCollar} />
          <Check label="Капюшон" checked={hood} onChange={setHood} />
          <Check label="Резинка на поясе" checked={elasticWaist} onChange={setElasticWaist} />
          <Check label="Резинка на манжетах" checked={elasticCuffs} onChange={setElasticCuffs} />
          <Check label="Обрабатываю оверлоком" checked={overlock} onChange={setOverlock} />
          <Check label="Контрастная отделочная строчка" checked={contrast} onChange={setContrast} />
        </div>
      </Card>

      <Card title="Что купить" accent>
        <ul className="space-y-2">
          {items.map((it) => {
            const owned = have.includes(it.id);
            return (
              <li
                key={it.id}
                className={`flex items-start justify-between gap-3 ${owned ? "opacity-50" : ""}`}
              >
                <div>
                  <div className={owned ? "line-through" : ""}>
                    <b>{it.name}</b>: {it.qty}
                  </div>
                  {it.note && <div className="text-xs text-stone-500">{it.note}</div>}
                </div>
                <Check label="Есть дома" checked={owned} onChange={() => toggleHave(it.id)} />
              </li>
            );
          })}
        </ul>
        <p className="rounded-xl bg-white p-3 text-sm">
          Примерно {rub(lo)}–{rub(hi)}. Проверь дома — возможно, нитки и пуговицы уже есть.
        </p>
      </Card>

      <Card title="Текст для магазина">
        <pre className="whitespace-pre-wrap rounded-xl bg-stone-100 p-4 text-sm">{text}</pre>
        <button className={btnCls} onClick={copy}>
          {copied ? "Скопировано ✓" : "Скопировать список"}
        </button>
      </Card>
    </PageShell>
  );
}
