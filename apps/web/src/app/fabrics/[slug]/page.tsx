import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  natural: "Натуральная",
  synthetic: "Синтетическая",
  blend: "Смесовая",
};

const weightLabels: Record<string, string> = {
  light: "Лёгкая",
  medium: "Средняя",
  heavy: "Тяжёлая",
  very_heavy: "Очень тяжёлая",
};

const stretchLabels: Record<string, string> = {
  none: "Нет",
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
};

const difficultyInfo: Record<string, { dots: string; label: string }> = {
  beginner: { dots: "●○○", label: "Легко работать" },
  intermediate: { dots: "●●○", label: "Средняя сложность" },
  advanced: { dots: "●●●", label: "Сложно работать" },
};

export default async function FabricDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDbSingleton();
  const fabric = await queries.getFabricBySlug(db, slug);

  if (!fabric) {
    notFound();
  }

  const diff = difficultyInfo[fabric.difficulty_to_work_with] ?? {
    dots: "○○○",
    label: "Неизвестно",
  };

  const settings = fabric.default_machine_settings as {
    needle_type?: string;
    needle_size?: string | string[];
    stitch_length_mm?: number[];
    stitch_width_mm?: number[];
    top_tension?: number[];
    presser_foot?: string;
    notes?: string;
  };

  const hasSeams =
    Array.isArray(fabric.recommended_edge_finish) &&
    fabric.recommended_edge_finish.length > 0;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:text-stone-800">
          Главная
        </Link>
        {" / "}
        <Link href="/fabrics" className="hover:text-stone-800">
          Ткани
        </Link>
        {" / "}
        <span className="text-stone-800">{fabric.name}</span>
      </nav>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-stone-900">{fabric.name}</h1>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
            {categoryLabels[fabric.category] ?? fabric.category}
          </span>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
            {weightLabels[fabric.weight_class] ?? fabric.weight_class}
          </span>
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
            Растяжимость: {stretchLabels[fabric.stretch] ?? fabric.stretch}
          </span>
        </div>

        <div className="flex items-center gap-2 text-base">
          <span className="text-amber-600" aria-hidden="true">
            {diff.dots}
          </span>
          <span className="text-stone-600">{diff.label}</span>
        </div>
      </div>

      {/* Description */}
      <section>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Описание</h2>
        <p className="text-stone-700 leading-relaxed">
          {fabric.composition}. {fabric.care_instructions}
        </p>
      </section>

      {/* Machine settings */}
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">
          Настройки машины Brother LS-200s
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
          {settings.needle_type && (
            <>
              <dt className="text-stone-500">Игла</dt>
              <dd className="text-stone-800">
                {settings.needle_type}
                {settings.needle_size
                  ? ` — ${Array.isArray(settings.needle_size) ? settings.needle_size.join(", ") : settings.needle_size}`
                  : ""}
              </dd>
            </>
          )}
          {settings.stitch_length_mm && (
            <>
              <dt className="text-stone-500">Длина стежка</dt>
              <dd className="text-stone-800">
                {settings.stitch_length_mm.join("–")} мм
              </dd>
            </>
          )}
          {settings.top_tension && (
            <>
              <dt className="text-stone-500">Натяжение нити</dt>
              <dd className="text-stone-800">
                {settings.top_tension.join("–")}
              </dd>
            </>
          )}
          {settings.presser_foot && (
            <>
              <dt className="text-stone-500">Лапка</dt>
              <dd className="text-stone-800">{settings.presser_foot}</dd>
            </>
          )}
          {settings.notes && (
            <>
              <dt className="text-stone-500">Дополнительно</dt>
              <dd className="text-stone-800">{settings.notes}</dd>
            </>
          )}
        </dl>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-semibold text-stone-900 mb-3">
          Советы по работе
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-stone-700 leading-relaxed">
          {fabric.common_issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </section>

      {/* Recommended seams */}
      {hasSeams && (
        <section>
          <h2 className="text-xl font-semibold text-stone-900 mb-3">
            Подходящие швы
          </h2>
          <ul className="space-y-2">
            {fabric.recommended_edge_finish.map((seamSlug) => (
              <li key={seamSlug}>
                <Link
                  href={`/seams/${seamSlug}`}
                  className="text-stone-800 hover:text-stone-600 underline underline-offset-2"
                >
                  {seamSlug.replace(/-/g, " ")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Link
          href="/fabrics"
          className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900"
        >
          ← Назад к каталогу
        </Link>
      </div>
    </div>
  );
}
