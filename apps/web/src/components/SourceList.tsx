"use client";

import { formatSourceDate, isSafeSourceUrl, sourceDomain, type Source } from "@shveyka/core";

/**
 * Список источников из интернета под ответом.
 *
 * Нумерация совпадает с ссылками в тексте ответа: [1] — первая ссылка.
 * Поэтому безопасность проверяется по каждому адресу отдельно, а не фильтром
 * по всему списку: иначе номера съехали бы и ссылка в тексте перестала бы
 * указывать на нужную страницу.
 *
 * У каждой карточки есть свой адрес якоря: ссылка [1] в тексте ведёт сюда.
 */
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-sm text-stone-500">Источники</p>
      <ol className="mt-2 space-y-2.5">
        {sources.map((source, index) => {
          const safe = isSafeSourceUrl(source.url);
          const domain = sourceDomain(source.url);
          const date = formatSourceDate(source.date);
          const snippet = source.snippet.trim();

          return (
            <li
              key={`${index}-${source.url}`}
              id={`source-${index + 1}`}
              className="scroll-mt-4 text-sm leading-snug"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  {safe ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-stone-800 underline underline-offset-2 hover:text-stone-600"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span className="font-medium text-stone-700">{source.title}</span>
                  )}
                  {(domain || date) && (
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-stone-400">
                      {domain && <span>{domain}</span>}
                      {date && <span>{date}</span>}
                    </div>
                  )}
                  {snippet && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">
                      {snippet}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
