import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbSingleton, queries } from "@shveyka/db";
import { fabricJsonLd } from "@shveyka/core";
import { AskShveykaButton } from "@/components/AskShveykaButton";
import { RelatedLinks } from "@/components/RelatedLinks";
import { JsonLd } from "@/components/JsonLd";
import { loadCatalog } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

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

export default async function FabricDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDbSingleton();
  const fabric = await queries.getFabricBySlug(db, slug);

  if (!fabric) {
    notFound();
  }

  const catalog = await loadCatalog();
  const links = catalog.graph.fabric(slug);

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

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Разметка для поисковиков: ткань — справочный термин, а не товар. */}
      <JsonLd
        data={fabricJsonLd({
          name: fabric.name,
          description: `${fabric.composition}. ${fabric.care_instructions}`,
          url: `${SITE_URL}/fabrics/${encodeURIComponent(fabric.id)}`,
          aliases: fabric.aliases,
        })}
      />

      {/* Breadcrumbs */}
      <nav className="text-sm text-ink-3">
        <Link href="/" className="hover:text-ink">
          Главная
        </Link>
        {" / "}
        <Link href="/fabrics" className="hover:text-ink">
          Ткани
        </Link>
        {" / "}
        <span className="text-ink">{fabric.name}</span>
      </nav>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-ink">{fabric.name}</h1>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-wash px-3 py-1 text-sm text-ink-2">
            {categoryLabels[fabric.category] ?? fabric.category}
          </span>
          <span className="inline-flex items-center rounded-full bg-wash px-3 py-1 text-sm text-ink-2">
            {weightLabels[fabric.weight_class] ?? fabric.weight_class}
          </span>
          <span className="inline-flex items-center rounded-full bg-wash px-3 py-1 text-sm text-ink-2">
            Растяжимость: {stretchLabels[fabric.stretch] ?? fabric.stretch}
          </span>
        </div>

        <div className="flex items-center gap-2 text-base">
          <span className="text-orange" aria-hidden="true">
            {diff.dots}
          </span>
          <span className="text-ink-2">{diff.label}</span>
        </div>
      </div>

      {/* Спросить помощника об этой ткани */}
      <AskShveykaButton question={`Как шить из ткани «${fabric.name}» на Brother LS-200s?`} />

      {/* Description */}
      <section>
        <h2 className="text-xl font-semibold text-ink mb-2">Описание</h2>
        <p className="text-ink-2 leading-relaxed">
          {fabric.composition}. {fabric.care_instructions}
        </p>
      </section>

      {/* Machine settings */}
      <section className="rounded-plate border border-hair bg-paper p-6 space-y-3">
        <h2 className="text-xl font-semibold text-ink">Настройки машины Brother LS-200s</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
          {settings.needle_type && (
            <>
              <dt className="text-ink-3">Игла</dt>
              <dd className="text-ink">
                {settings.needle_type}
                {settings.needle_size
                  ? ` — ${Array.isArray(settings.needle_size) ? settings.needle_size.join(", ") : settings.needle_size}`
                  : ""}
              </dd>
            </>
          )}
          {settings.stitch_length_mm && (
            <>
              <dt className="text-ink-3">Длина стежка</dt>
              <dd className="text-ink">{settings.stitch_length_mm.join("–")} мм</dd>
            </>
          )}
          {settings.top_tension && (
            <>
              <dt className="text-ink-3">Натяжение нити</dt>
              <dd className="text-ink">{settings.top_tension.join("–")}</dd>
            </>
          )}
          {settings.presser_foot && (
            <>
              <dt className="text-ink-3">Лапка</dt>
              <dd className="text-ink">{settings.presser_foot}</dd>
            </>
          )}
          {settings.notes && (
            <>
              <dt className="text-ink-3">Дополнительно</dt>
              <dd className="text-ink">{settings.notes}</dd>
            </>
          )}
        </dl>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-semibold text-ink mb-3">Советы по работе</h2>
        <ul className="list-disc pl-5 space-y-2 text-ink-2 leading-relaxed">
          {fabric.common_issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </section>

      {/* Связи каталога: швы и проекты, где эта ткань уместна */}
      <RelatedLinks title="Подходящие швы" items={links.seams} />
      <RelatedLinks title="Проекты из этой ткани" items={links.projects} />

      {/* Back link */}
      <div className="pt-4">
        <Link href="/fabrics" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
          ← Назад к каталогу
        </Link>
      </div>
    </div>
  );
}
