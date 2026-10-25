import { classifySeam, renderSeamSvg } from "@shveyka/core";

/**
 * Схема шва на странице.
 *
 * Своя картинка (diagram_url) главнее: появится реальное фото — оно встанет
 * на место схемы само. Пока картинки нет, схему рисуем по типу шва.
 */
export function SeamDiagram({
  id,
  slug,
  name,
  diagramUrl,
}: {
  id?: string;
  slug?: string;
  name: string;
  diagramUrl?: string | null;
}) {
  if (diagramUrl) {
    // Обычный img: правило next/no-img-element в проекте не включено,
    // а картинка шва — это внешний файл из поля diagram_url.
    return (
      <img
        src={diagramUrl}
        alt={`Схема шва «${name}»`}
        className="w-full max-w-md rounded-xl border border-stone-200 bg-white"
        loading="lazy"
      />
    );
  }

  // Схема собирается в ядре, внешний текст попадает только в aria-label
  // и там же экранируется.
  const svg = renderSeamSvg(classifySeam({ id, slug, name }), `Схема шва «${name}»`);

  return (
    <div
      className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-3 text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
