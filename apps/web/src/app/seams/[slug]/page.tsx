import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbSingleton, queries } from "@shveyka/db";
import { howToJsonLd, readSteps } from "@shveyka/core";
import { AskShveykaButton } from "@/components/AskShveykaButton";
import { RelatedLinks } from "@/components/RelatedLinks";
import { JsonLd } from "@/components/JsonLd";
import { SeamDiagram } from "@/components/SeamDiagram";
import { loadCatalog } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";
import type { SeamStep } from "@shveyka/core";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = {
  join: "Соединительный",
  edge_finish: "Обработка среза",
  hem: "Подгиб",
  decorative: "Декоративный",
  closure: "Застёжка",
  facing: "Обтачка",
};

const difficultyInfo: Record<string, { dots: string; label: string }> = {
  beginner: { dots: "●○○", label: "Легко выполнить" },
  intermediate: { dots: "●●○", label: "Средняя сложность" },
  advanced: { dots: "●●●", label: "Сложно выполнить" },
};

const weightLabels: Record<string, string> = {
  light: "Лёгкая",
  medium: "Средняя",
  heavy: "Тяжёлая",
  very_heavy: "Очень тяжёлая",
};

export default async function SeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDbSingleton();
  const seam = await queries.getSeamById(db, slug);

  if (!seam) {
    notFound();
  }

  const catalog = await loadCatalog();
  const links = catalog.graph.seam(slug);

  const diff = difficultyInfo[seam.difficulty] ?? {
    dots: "○○○",
    label: "Неизвестно",
  };

  const steps = seam.steps as SeamStep[];
  const mistakes = seam.common_mistakes as string[];
  const variants =
    (seam.variants as Array<{ id: string; name: string; difference: string }> | null) ?? [];
  const weights = seam.suitable_weight_classes as string[];
  const settings = seam.default_machine_settings as {
    needle_type?: string;
    needle_size?: string;
    stitch_type?: string;
    stitch_length_mm?: number[];
    top_tension?: number[];
    presser_foot?: string;
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Разметка для поисковиков: шов — это пошаговая инструкция. */}
      <JsonLd
        data={howToJsonLd({
          name: seam.name,
          description: seam.when_to_use,
          url: `${SITE_URL}/seams/${encodeURIComponent(seam.id)}`,
          steps: readSteps(seam.steps),
        })}
      />

      {/* Breadcrumbs */}
      <nav className="text-sm text-ink-3">
        <Link href="/" className="hover:text-ink">
          Главная
        </Link>
        {" / "}
        <Link href="/seams" className="hover:text-ink">
          Швы
        </Link>
        {" / "}
        <span className="text-ink">{seam.name}</span>
      </nav>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-ink">{seam.name}</h1>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-wash px-3 py-1 text-sm text-ink-2">
            {typeLabels[seam.type] ?? seam.type}
          </span>
          {weights.map((w) => (
            <span
              key={w}
              className="inline-flex items-center rounded-full bg-wash px-3 py-1 text-sm text-ink-2"
            >
              {weightLabels[w] ?? w}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-base">
          <span className="text-orange" aria-hidden="true">
            {diff.dots}
          </span>
          <span className="text-ink-2">{diff.label}</span>
        </div>
      </div>

      {/* Спросить помощника об этом шве */}
      <AskShveykaButton question={`Как выполнить шов «${seam.name}» на Brother LS-200s?`} />

      {/* Схема шва: своя картинка, если она есть, иначе — нарисованная схема */}
      <SeamDiagram id={seam.id} slug={seam.id} name={seam.name} diagramUrl={seam.diagram_url} />

      {/* When to use */}
      <section>
        <h2 className="text-xl font-semibold text-ink mb-2">Когда использовать</h2>
        <p className="text-ink-2 leading-relaxed">{seam.when_to_use}</p>
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
                {settings.needle_size ? ` — ${settings.needle_size}` : ""}
              </dd>
            </>
          )}
          {settings.stitch_type && (
            <>
              <dt className="text-ink-3">Тип строчки</dt>
              <dd className="text-ink">{settings.stitch_type}</dd>
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
        </dl>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-xl font-semibold text-ink mb-3">Пошаговая инструкция</h2>
        <ol className="space-y-4">
          {steps.map((step) => (
            <li
              key={step.order}
              className="rounded-plate border border-hair bg-paper-hi p-5 space-y-2"
            >
              <p className="text-ink leading-relaxed">
                <span className="font-semibold">{step.order}.</span> {step.instruction}
              </p>
              {step.tip && <p className="text-ink-2 italic leading-relaxed">Совет: {step.tip}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* Common mistakes */}
      {mistakes.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-ink mb-3">Частые ошибки</h2>
          <ul className="list-disc pl-5 space-y-2 text-ink-2 leading-relaxed">
            {mistakes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-ink mb-3">Варианты</h2>
          <ul className="space-y-3">
            {variants.map((v) => (
              <li key={v.id} className="rounded-plate border border-hair bg-paper-hi p-4">
                <p className="font-semibold text-ink">{v.name}</p>
                <p className="text-ink-2 leading-relaxed">{v.difference}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Связи каталога: ткани, которым подходит шов, и проекты, где он нужен */}
      <RelatedLinks title="Подходит для тканей" items={links.fabrics} />
      <RelatedLinks title="Где применяется" items={links.projects} />

      {/* Back link */}
      <div className="pt-4">
        <Link href="/seams" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
          ← Назад к каталогу
        </Link>
      </div>
    </div>
  );
}
