import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbSingleton, queries } from "@shveyka/db";
import { fabricJsonLd } from "@shveyka/core";
import { AskShveykaButton } from "@/components/AskShveykaButton";
import { RelatedLinks } from "@/components/RelatedLinks";
import { JsonLd } from "@/components/JsonLd";
import { FabricPassport, type PassportSettings } from "@/components/FabricPassport";
import { loadCatalog } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function FabricDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDbSingleton();
  const fabric = await queries.getFabricBySlug(db, slug);

  if (!fabric) {
    notFound();
  }

  const catalog = await loadCatalog();
  const links = catalog.graph.fabric(slug);

  const settings = fabric.default_machine_settings as PassportSettings;

  return (
    <div className="space-y-8">
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

      {/* Паспорт ткани: плита в три колонки. */}
      <div className="fabric-passport-plate">
        <FabricPassport
          fabric={{
            name: fabric.name,
            aliases: fabric.aliases,
            composition: fabric.composition,
            category: fabric.category,
            weight_class: fabric.weight_class,
            stretch: fabric.stretch,
            difficulty_to_work_with: fabric.difficulty_to_work_with,
            density_min_gsm: fabric.density_min_gsm,
            density_max_gsm: fabric.density_max_gsm,
            shrinkage_percent: fabric.shrinkage_percent,
            requires_decatizing: fabric.requires_decatizing,
            care_instructions: fabric.care_instructions,
            common_issues: fabric.common_issues,
            default_machine_settings: settings,
          }}
          edgeSeams={links.seams.map((seam) => ({ name: seam.name, href: seam.href }))}
        />
      </div>

      {/* Спросить помощника об этой ткани */}
      <AskShveykaButton question={`Как шить из ткани «${fabric.name}» на Brother LS-200s?`} />

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
