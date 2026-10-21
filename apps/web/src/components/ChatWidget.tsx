"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { parseLinkSegments } from "@shveyka/core";

type Message = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 10;
const MAX_INPUT = 1000;

/**
 * Превращает ссылки вида [название](/fabrics/slug) в next/link.
 * Кликабельными становятся только ссылки на slug из allowedSlugs
 * (заголовок X-Context-Slugs ответа /api/chat). Остальной текст
 * выводится как есть (React экранирует его сам).
 */
function renderContent(text: string, allowedSlugs: Set<string>): ReactNode[] {
  return parseLinkSegments(text, allowedSlugs).map((segment, i) =>
    segment.kind === "link" ? (
      <Link
        key={`link-${i}`}
        href={segment.href}
        className="underline underline-offset-2 hover:text-stone-600"
      >
        {segment.text}
      </Link>
    ) : (
      <span key={`text-${i}`}>{segment.text}</span>
    )
  );
}

/**
 * Чат помощника.
 *
 * initialMessage — готовый вопрос с другого экрана (например, из
 * калькулятора): он отправляется сам, без лишнего нажатия.
 */
export function ChatWidget({ initialMessage }: { initialMessage?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  // Разрешённые slug последнего ответа ассистента ("тип/slug").
  const [allowedSlugsByIndex, setAllowedSlugsByIndex] = useState<Record<number, Set<string>>>({});
  const [input, setInput] = useState(initialMessage?.slice(0, MAX_INPUT) ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (loading || !text) return;

      const userMessage: Message = { role: "user", content: text };
      const history: Message[] = [...messages, userMessage].slice(-MAX_MESSAGES);
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Не удалось получить ответ, попробуйте позже");
        }

        // Разрешённые slug этого ответа — только они кликабельны.
        const slugsHeader = res.headers.get("X-Context-Slugs") ?? "";
        const allowed = new Set(
          slugsHeader
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
        setAllowedSlugsByIndex((prev) => ({ ...prev, [history.length]: allowed }));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
            return copy;
          });
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось получить ответ, попробуйте позже";
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendMessage(input);
  }

  // Вопрос из ссылки отправляем один раз, при открытии страницы.
  const autoSent = useRef(false);
  useEffect(() => {
    const initial = initialMessage?.trim();
    if (!initial || autoSent.current) return;
    autoSent.current = true;
    void sendMessage(initial);
  }, [initialMessage, sendMessage]);

  function onInputChange(value: string) {
    setInput(value.slice(0, MAX_INPUT));
    if (error) setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 min-h-[320px] space-y-3">
        {messages.length === 0 && (
          <p className="text-stone-500">
            Спросите про ткань, шов или проект. Ответы опираются только на каталог Швейки.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-stone-900 px-4 py-2 text-white whitespace-pre-wrap"
                : "mr-auto max-w-[85%] rounded-2xl bg-stone-100 px-4 py-2 text-stone-800 whitespace-pre-wrap leading-relaxed"
            }
          >
            {m.role === "assistant"
              ? renderContent(m.content, allowedSlugsByIndex[i] ?? new Set<string>())
              : m.content}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={send} className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={MAX_INPUT}
          rows={3}
          placeholder="Спросите про ткань, шов или проект…"
          className="w-full rounded-2xl border border-stone-300 bg-white p-3 text-stone-800 focus:outline-none focus:border-stone-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">
            {input.length} / {MAX_INPUT}
          </span>
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="rounded-full bg-stone-900 px-5 py-2 text-white disabled:opacity-40 hover:bg-stone-700"
          >
            {loading ? "Думаю…" : "Отправить"}
          </button>
        </div>
      </form>
    </div>
  );
}
