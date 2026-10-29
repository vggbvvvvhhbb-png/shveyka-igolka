"use client";

import { formatSourceDate, isSafeSourceUrl, sourceDomain, type Source } from "@shveyka/core";

/**
 * Список источников из интернета под ответом.
 *
 * Нумерация совпадает с ссылками в тексте ответа: [1] — первая ссылка.
 * Поэтому безопасность проверяется по каждому адресу отдельно, а не фильтром
 * по всему списку: иначе номера съехали бы и ссылка в тексте перестала бы
 * указывать на нужную страницу.
 */
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-sm text-stone-500">Источники</p>
      <ol className="mt-2 space-y-1.5">
        {sources.map((source, index) => {
          const safe = isSafeSourceUrl(source.url);
          const domain = sourceDomain(source.url);
          const date = formatSourceDate(source.date);

          return (
            <li key={`${index}-${source.url}`} className="text-sm leading-snug">
              {safe ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-stone-600"
                >
                  [{index + 1}] {source.title}
                </a>
              ) : (
                <span className="text-stone-600">
                  [{index + 1}] {source.title}
                </span>
              )}
              {domain && <span className="ml-2 text-xs text-stone-400">{domain}</span>}
              {date && <span className="ml-2 text-xs text-stone-400">{date}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
