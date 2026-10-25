import { serializeJsonLd, type JsonLd as JsonLdData } from "@shveyka/core";

/**
 * Разметка schema.org для поисковиков.
 *
 * Данные приходят из каталога, поэтому строка экранируется: иначе значение
 * из БД смогло бы закрыть тег `<script>`.
 */
export function JsonLd({ data }: { data: JsonLdData | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
