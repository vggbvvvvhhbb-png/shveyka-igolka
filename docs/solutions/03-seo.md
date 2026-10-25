# 03. SEO-каркас

**Проблема (D6/B10).** Нет sitemap, robots, JSON-LD и адреса сайта.

## Решение

| Файл                        | Роль                                                                              |
| --------------------------- | --------------------------------------------------------------------------------- |
| `core/seo/sitemap.ts`       | `normalizeBaseUrl` (только http/https, без хвоста), `buildSitemap`                |
| `core/seo/jsonld.ts`        | `readSteps`, `howToJsonLd`, `fabricJsonLd`, `serializeJsonLd`                     |
| `web/lib/site.ts`           | `SITE_URL` из `NEXT_PUBLIC_SITE_URL`, список статических страниц                  |
| `web/app/sitemap.ts`        | 35 + 16 + 6 страниц и служебные; `dynamic = 'force-dynamic'` — сборке не нужна БД |
| `web/app/robots.ts`         | закрывает `/api/`, `/journal`, `/measurements`, `/owner`, `/assistant/history`    |
| `web/components/JsonLd.tsx` | вывод разметки                                                                    |

Решения:

- **Ткань — `DefinedTerm`, не `Product`.** У нас нет цены и наличия; `Product` породил бы ошибки в Search Console.
- **`HowTo`** для шва и проекта: шаги, суммарное время (`PT…M`) из `estimated_minutes`, `supply`. Без шагов разметка не выводится.
- **`serializeJsonLd` экранирует `<`**: строка из БД не закроет тег `<script>` (XSS).
- `lastModified` — самый свежий `updated_at` каталога.

## Подключение

```tsx
// apps/web/src/app/layout.tsx
import { SITE_URL } from '@/lib/site';
export const metadata: Metadata = { metadataBase: new URL(SITE_URL) /* …остальное как было */ };

// страница шва или проекта
<JsonLd data={howToJsonLd({
  name: seam.name, description: seam.description,
  url: `${SITE_URL}/seams/${slug}`, steps: readSteps(seam.steps),
})} />

// страница ткани
<JsonLd data={fabricJsonLd({ name: f.name, description: f.description, url: `${SITE_URL}/fabrics/${slug}`, aliases: f.aliases ?? [] })} />
```

## Проверка

`pnpm build && pnpm start`, затем `/sitemap.xml`, `/robots.txt`; разметку — в Rich Results Test.
