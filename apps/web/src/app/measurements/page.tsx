import { MeasurementsForm } from "@/components/MeasurementsForm";
import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Мерки — Помощник Швейка",
  description: "Мерки пользователя: Швейка учитывает их при подборе проекта и расчёте ткани.",
};

export default async function MeasurementsPage() {
  const db = getDbSingleton();
  const row = await queries.getMeasurements(db);

  const initial = {
    bust: row?.bust ?? undefined,
    waist: row?.waist ?? undefined,
    hip: row?.hip ?? undefined,
    height: row?.height ?? undefined,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Мерки</h1>
        <p className="text-stone-600">
          Швейка учитывает мерки, когда подбирает проект и считает расход ткани. Мерки остаются на
          этом устройстве и никуда не отправляются, пока вы сами не спросите про них в чате.
        </p>
      </div>

      <MeasurementsForm initial={initial} />
    </div>
  );
}
