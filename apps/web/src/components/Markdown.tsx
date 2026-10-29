"use client";

import Link from "next/link";
import { Fragment } from "react";
import {
  catalogSlugOf,
  isSafeLinkHref,
  parseInline,
  parseMarkdown,
  type MdBlock,
  type MdInline,
} from "@shveyka/core";

/**
 * Показ ответа с разметкой.
 *
 * Текст приходит из интернета, поэтому он не вставляется в страницу как HTML:
 * разметку разбирает ядро, а здесь она превращается в элементы React. Ссылка
 * на источник [1] ведёт к карточке источника, ссылка на запись каталога — на
 * страницу записи.
 */
export function Markdown({
  text,
  allowedSlugs,
  sourceCount = 0,
}: {
  text: string;
  /** Записи каталога, ссылки на которые разрешены: «тип/slug». */
  allowedSlugs: Set<string>;
  /** Сколько источников у ответа: столько ссылок [n] ведут к карточкам. */
  sourceCount?: number;
}) {
  const blocks = parseMarkdown(text);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <Block key={index} block={block} allowedSlugs={allowedSlugs} sourceCount={sourceCount} />
      ))}
    </div>
  );
}

/** Один блок ответа. */
function Block({
  block,
  allowedSlugs,
  sourceCount,
}: {
  block: MdBlock;
  allowedSlugs: Set<string>;
  sourceCount: number;
}) {
  const inline = (text: string) => (
    <Inline parts={parseInline(text)} allowedSlugs={allowedSlugs} sourceCount={sourceCount} />
  );

  switch (block.kind) {
    case "heading": {
      const size =
        block.level <= 2
          ? "text-base font-semibold text-stone-900"
          : block.level === 3
            ? "text-sm font-semibold text-stone-900"
            : "text-sm font-medium text-stone-700";
      return <p className={size}>{inline(block.text)}</p>;
    }
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index} className="leading-relaxed">
          {inline(item)}
        </li>
      ));
      return block.ordered ? (
        <ol className="list-inside list-decimal space-y-1 text-stone-800">{items}</ol>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-stone-800">{items}</ul>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-2 border-stone-300 pl-3 italic text-stone-600">
          {inline(block.text)}
        </blockquote>
      );
    case "rule":
      return <hr className="border-stone-200" />;
    default:
      return <p className="leading-relaxed text-stone-800">{inline(block.text)}</p>;
  }
}

/** Кусок текста внутри абзаца. */
function Inline({
  parts,
  allowedSlugs,
  sourceCount,
}: {
  parts: MdInline[];
  allowedSlugs: Set<string>;
  sourceCount: number;
}) {
  return (
    <>
      {parts.map((part, index) => {
        switch (part.kind) {
          case "bold":
            return (
              <strong key={index} className="font-semibold text-stone-900">
                {part.text}
              </strong>
            );
          case "italic":
            return (
              <em key={index} className="italic">
                {part.text}
              </em>
            );
          case "code":
            return (
              <code key={index} className="rounded bg-stone-200 px-1 py-0.5 text-[0.9em]">
                {part.text}
              </code>
            );
          case "citation": {
            const number = part.index;
            if (number < 1 || (sourceCount > 0 && number > sourceCount)) {
              return <Fragment key={index}>[{number}]</Fragment>;
            }
            return (
              <a
                key={index}
                href={`#source-${number}`}
                title={`Источник ${number}`}
                className="mx-0.5 rounded bg-stone-200 px-1 text-[0.75em] font-medium text-stone-600 no-underline hover:bg-stone-300"
              >
                {number}
              </a>
            );
          }
          case "link": {
            const slug = catalogSlugOf(part.href);
            if (slug) {
              // Ссылка на каталог показывается только для той записи, что
              // действительно попала в контекст ответа.
              if (!allowedSlugs.has(slug)) {
                return <Fragment key={index}>{part.text}</Fragment>;
              }
              return (
                <Link
                  key={index}
                  href={part.href}
                  className="underline underline-offset-2 hover:text-stone-600"
                >
                  {part.text}
                </Link>
              );
            }
            if (!isSafeLinkHref(part.href)) {
              return <Fragment key={index}>{part.text}</Fragment>;
            }
            return (
              <a
                key={index}
                href={part.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-stone-600"
              >
                {part.text}
              </a>
            );
          }
          default:
            return <Fragment key={index}>{part.text}</Fragment>;
        }
      })}
    </>
  );
}
