# 02. Каталог как маршрут: ткань → шов → проект

**Данные уже есть** (D6a, B1) — нужен рендер. Связи строятся только из реальных полей; пустой блок не показывается.

## Решение

`packages/core/src/catalog/links.ts` строит граф из трёх списков:

| Страница | Блок                                  | Источник                                                     |
| -------- | ------------------------------------- | ------------------------------------------------------------ |
| ткань    | «С этой тканью шьют»                  | `recommended_edge_finish`                                    |
| ткань    | «Из неё шьют»                         | проекты, у которых ткань в `recommended_fabrics`             |
| шов      | «Подходит для тканей»                 | `preferred_fabrics` ∪ **инверсия** `recommended_edge_finish` |
| шов      | «Где применяется»                     | проекты с этим швом в `required_seams`                       |
| проект   | «Нужные швы», «Рекомендованные ткани» | `required_seams`, `recommended_fabrics`                      |

- Ссылки разрешаются и по `id`, и по `slug`; битые молча пропускаются; дубли убираются.
- Поле `preferred_fabrics` пустое у всех швов — поэтому инверсия, сид править не нужно.
- Ссылки — обычные `<Link>` (компонент `RelatedLinks`), серверный рендер.

## Подключение

```tsx
// apps/web/src/app/(list)/seams/[slug]/page.tsx
const { graph } = await loadCatalog();
const rel = graph.seam(slug);
// ...
<RelatedLinks title="Подходит для тканей" items={rel.fabrics} />
<RelatedLinks title="Где применяется" items={rel.projects} />
```

Аналогично: `graph.fabric(slug)` → `seams`, `projects`; `graph.project(slug)` → `seams`, `fabrics`.

`lib/catalog.ts` кэширует каталог на 60 с — три страницы подряд не бьют БД трижды.

## Тесты

`links.test.ts`: разрешение по id/slug, битые ссылки, инверсия без дублей, порядок, неизвестный slug.
