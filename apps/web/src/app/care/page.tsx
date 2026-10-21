"use client";

import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CARE_DENSITY_LABELS,
  CARE_GARMENT_LABELS,
  generateCare,
  parseComposition,
  type CareDensity,
  type CareGarment,
} from "@shveyka/core/calculator/care";
import { CareIcon } from "@/components/CareIcon";
import {
  btnCls,
  btnGhostCls,
  Card,
  Check,
  Field,
  inputCls,
  PageShell,
  SelectField,
} from "@/components/ui";
import { aiUrl } from "@/lib/ai";

const densityOptions = (Object.entries(CARE_DENSITY_LABELS) as [CareDensity, string][]).map(
  ([value, label]) => ({ value, label })
);

const garmentOptions = (Object.entries(CARE_GARMENT_LABELS) as [CareGarment, string][]).map(
  ([value, label]) => ({ value, label })
);

/** Блок инструкции: заголовок и список пунктов. */
function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-medium text-stone-900">{title}</h3>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-stone-700">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CarePage() {
  const [text, setText] = useState("Шерсть 80% + акрил 20%");
  const [density, setDensity] = useState<CareDensity>("heavy");
  const [garment, setGarment] = useState<CareGarment>("coat");
  const [pile, setPile] = useState(false);
  const [print, setPrint] = useState(false);

  const fibers = parseComposition(text);
  const care = fibers.length > 0 ? generateCare({ fibers, density, pile, print, garment }) : null;

  return (
    <PageShell
      title="Уход за тканью"
      subtitle="Введи состав — получишь инструкцию как на бирке, только подробнее"
    >
      <Card title="Ткань">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label="Состав"
              hint="Например: «хлопок 95% + эластан 5%», «лён 100%» или просто «шерстяное пальто»"
            >
              <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
          </div>
          <SelectField
            label="Плотность"
            value={density}
            onChange={setDensity}
            options={densityOptions}
          />
          <SelectField
            label="Изделие"
            value={garment}
            onChange={setGarment}
            options={garmentOptions}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Check label="Есть ворс (бархат, велюр, махра)" checked={pile} onChange={setPile} />
          <Check label="Есть рисунок (принт, вышивка)" checked={print} onChange={setPrint} />
        </div>
      </Card>

      {!care && (
        <Card>
          <p className="text-sm">
            Не удалось распознать состав. Напиши, например, «хлопок 100%», или спроси помощника.
          </p>
          <Link href={aiUrl(`Как ухаживать за тканью: ${text}`)} className={btnGhostCls}>
            Спросить помощника
          </Link>
        </Card>
      )}

      {care && (
        <>
          {care.warnings.map((w) => (
            <Card key={w} accent>
              <p>
                ⚠️ <b>Важно:</b> {w}
              </p>
            </Card>
          ))}

          <Card title={`Уход: ${care.title}`}>
            <div className="flex flex-wrap gap-4">
              {care.icons.map((ic) => (
                <CareIcon key={ic.label} icon={ic} />
              ))}
            </div>
            <Section title="Стирка" items={care.wash} />
            <Section title="Сушка" items={care.dry} />
            <Section title="Глажка" items={care.iron} />
            <Section title="Хранение" items={care.storage} />
            <Section title="Ремонт и восстановление" items={care.repair} />
          </Card>

          {care.reminders.length > 0 && (
            <Card title="Напоминания">
              <Section title="" items={care.reminders} />
            </Card>
          )}

          <Card title="QR-код на изделие">
            <div className="flex flex-wrap items-center gap-4">
              <QRCodeSVG value={care.qrText} size={128} />
              <div className="space-y-2 text-sm">
                <p>Распечатай и приклей к изделию — там краткая инструкция по уходу.</p>
                <button className={btnCls} onClick={() => window.print()}>
                  Распечатать
                </button>
              </div>
            </div>
          </Card>

          <Link
            href={aiUrl(
              `Составь подробную инструкцию по уходу: ${text}, изделие: ${garment}, плотность: ${density}.`
            )}
            className={btnGhostCls}
          >
            Уточнить у помощника
          </Link>
        </>
      )}
    </PageShell>
  );
}
