"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  WORK_MODES,
  WORK_MODE_HINTS,
  WORK_MODE_LABELS,
  parseAnswer,
  parseRelatedLinks,
  type AnswerMode,
  type AssistantResponse,
  type Source,
  type WorkMode,
} from "@shveyka/core";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { Markdown } from "@/components/Markdown";
import { SourceList } from "@/components/SourceList";

/**
 * id и slugs появляются у ответа ассистента, когда он сохранён в истории:
 * по id ответ можно оценить, slugs — записи каталога из его контекста.
 *
 * workMode, sources, steps и model — то, чем ответ отличается от обычного:
 * режим работы, ссылки из интернета, ход работы и имя модели.
 *
 * followUps и related — вопросы для кнопок и записи каталога, попавшие в ответ.
 * Они сохраняются вместе с ответом, поэтому в открытом заново диалоге кнопки
 * и карточки остаются на месте.
 */
export type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  slugs?: string[];
  workMode?: WorkMode;
  sources?: Source[];
  steps?: string[];
  model?: string;
  /** Вопросы для кнопок под ответом. */
  followUps?: string[];
  /** Записи каталога, попавшие в ответ. */
  related?: { label: string; href: string }[];
};

const MAX_MESSAGES = 10;
const MAX_INPUT = 1000;

/** Режимы ответа: «Обычно» — без режима, остальные меняют форму ответа. */
const MODES: { value: AnswerMode | null; label: string }[] = [
  { value: null, label: "Обычно" },
  { value: "short", label: "Коротко" },
  { value: "steps", label: "По шагам" },
  { value: "why", label: "Почему" },
];

/** Что показывать, пока ответ в пути: у каждого режима своя формулировка. */
const PENDING_TEXT: Record<WorkMode, string> = {
  chat: "Думаю…",
  search: "Ищу в интернете…",
  reason: "Думаю…",
  research: "Исследую…",
};

/**
 * Чат помощника.
 *
 * initialMessage — готовый вопрос с другого экрана (например, из
 * калькулятора): он отправляется сам, без лишнего нажатия.
 *
 * ctx — страница каталога, с которой пришёл вопрос (`fabric/<slug>`).
 * Запись этой страницы попадает в контекст ответа первой.
 *
 * initialMessages и conversationId — открытый из истории диалог: переписка
 * продолжается в том же диалоге.
 */
export function ChatWidget({
  initialMessage,
  initialMessages,
  conversationId: initialConversationId,
  ctx,
}: {
  initialMessage?: string;
  initialMessages?: Message[];
  conversationId?: string;
  ctx?: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  // Разрешённые slug последнего ответа ассистента ("тип/slug").
  const [allowedSlugsByIndex, setAllowedSlugsByIndex] = useState<Record<number, Set<string>>>({});
  const [input, setInput] = useState(initialMessage?.slice(0, MAX_INPUT) ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AnswerMode | null>(null);
  // Режим работы: каталог, поиск, рассуждение или ресёрч.
  const [workMode, setWorkMode] = useState<WorkMode>("chat");
  // Поле ввода: на него переходит фокус после нажатия вопроса под ответом.
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

      // Режимы с интернетом отвечают не потоком, а готовым объектом:
      // в нём есть источники, ход работы и имя модели.
      if (workMode !== "chat") {
        try {
          const res = await fetch("/api/assistant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
            },
            body: JSON.stringify({
              message: text,
              mode: workMode,
              ...(mode ? { style: mode } : {}),
              ...(ctx ? { ctx } : {}),
            }),
          });

          const data = (await res.json().catch(() => null)) as
            | (AssistantResponse & { error?: string })
            | { error?: string }
            | null;

          if (!res.ok || !data || "error" in data) {
            throw new Error(
              (data && "error" in data && data.error) ||
                "Не удалось получить ответ, попробуйте позже"
            );
          }

          const answer = data as AssistantResponse;

          // Разрешённые slug этого ответа — только они кликабельны.
          const allowed = new Set(
            (res.headers.get("X-Context-Slugs") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          );
          setAllowedSlugsByIndex((prev) => ({ ...prev, [history.length]: allowed }));

          // Сервер сохраняет диалог и выдаёт его id: запоминаем и кладём в адрес,
          // чтобы страницу можно было перезагрузить.
          const savedConversationId = res.headers.get("X-Conversation-Id");
          if (savedConversationId && savedConversationId !== conversationId) {
            setConversationId(savedConversationId);
            window.history.replaceState(null, "", `/assistant?c=${savedConversationId}`);
          }

          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = {
              ...last,
              content: answer.answer,
              id: answer.messageId ?? undefined,
              slugs: [...allowed],
              workMode: answer.mode,
              sources: answer.sources,
              steps: answer.steps,
              model: answer.model,
              followUps: answer.followUps ?? [],
              related: answer.related ?? [],
            };
            return copy;
          });

          if (answer.degraded) setError(answer.degraded);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Не удалось получить ответ, попробуйте позже";
          setError(msg);
          setMessages((prev) => prev.slice(0, -1));
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
          },
          // В запрос уходят только роль и текст: id и slugs нужны одному интерфейсу.
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            ...(ctx ? { ctx } : {}),
            ...(mode ? { mode } : {}),
          }),
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

        // Записи каталога из контекста ответа: показываются карточками под
        // ответом, чтобы можно было сразу перейти к нужной записи.
        const related = parseRelatedLinks(res.headers.get("X-Context-Related"));

        // Сервер сохраняет диалог и выдаёт его id: запоминаем и кладём в адрес,
        // чтобы страницу можно было перезагрузить.
        const savedConversationId = res.headers.get("X-Conversation-Id");
        const savedMessageId = res.headers.get("X-Message-Id");
        if (savedConversationId && savedConversationId !== conversationId) {
          setConversationId(savedConversationId);
          window.history.replaceState(null, "", `/assistant?c=${savedConversationId}`);
        }

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

        // Блок вопросов вынимается из текста и становится кнопками: пока
        // ответ шёл потоком, он уже был виден кнопками, а в переписке остаётся
        // чистый текст и сами вопросы.
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role !== "assistant") return copy;
          const parsed = parseAnswer(last.content);
          copy[copy.length - 1] = {
            ...last,
            content: parsed.text,
            followUps: parsed.followUps,
            related,
            ...(savedMessageId ? { id: savedMessageId, slugs: [...allowed] } : {}),
          };
          return copy;
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось получить ответ, попробуйте позже";
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, conversationId, ctx, mode, workMode]
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

  /**
   * Вопрос из кнопки под ответом: подставляем его в поле ввода.
   *
   * Отправлять сразу не стоит: человек может поправить вопрос, а лимит
   * запросов к режимам с интернетом общий на адрес.
   */
  function askFollowUp(question: string) {
    setInput(question.slice(0, MAX_INPUT));
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 min-h-[320px] space-y-3">
        {messages.length === 0 && (
          <p className="text-stone-500">
            Спросите про ткань, шов или проект. Ответы опираются только на каталог Швейки.
          </p>
        )}
        {messages.map((m, i) => {
          // У свежего ответа slug приходят из заголовка ответа, у открытого
          // заново диалога — из сохранённого сообщения.
          const allowed = m.slugs
            ? new Set(m.slugs)
            : (allowedSlugsByIndex[i] ?? new Set<string>());
          // Блок вопросов разбирается на лету: пока ответ идёт потоком,
          // вопросы уже видны кнопками, а не текстом в конце ответа.
          const parsed = m.role === "assistant" ? parseAnswer(m.content) : null;
          const text = parsed ? parsed.text : m.content;
          const followUps = m.followUps ?? parsed?.followUps ?? [];
          // Пустой ответ помощника во время ожидания: показываем, что он думает.
          const isPending = loading && m.role === "assistant" && m.content.length === 0;
          return (
            <div key={i} className="space-y-1">
              <div
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-stone-900 px-4 py-2 text-white whitespace-pre-wrap"
                    : "mr-auto max-w-[85%] rounded-2xl bg-stone-100 px-4 py-2 text-stone-800"
                }
              >
                {m.role === "assistant" ? (
                  isPending ? (
                    <span className="animate-pulse text-stone-500">{PENDING_TEXT[workMode]}</span>
                  ) : (
                    <Markdown
                      text={text}
                      allowedSlugs={allowed}
                      sourceCount={m.sources?.length ?? 0}
                    />
                  )
                ) : (
                  m.content
                )}
              </div>

              {m.role === "assistant" && (
                <div className="mr-auto max-w-[85%] space-y-2">
                  {m.workMode && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5">
                        Режим: {WORK_MODE_LABELS[m.workMode]}
                      </span>
                      {m.model && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5">{m.model}</span>
                      )}
                    </div>
                  )}

                  {m.steps && m.steps.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-stone-500">Ход работы</summary>
                      <ul className="mt-1 list-inside list-disc space-y-0.5 text-stone-600">
                        {m.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {m.sources && m.sources.length > 0 && <SourceList sources={m.sources} />}

                  {m.related && m.related.length > 0 && (
                    <div className="rounded-xl border border-stone-200 bg-white p-3">
                      <p className="text-sm text-stone-500">Из каталога Швейки</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.related.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 hover:bg-stone-200"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {followUps.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => askFollowUp(question)}
                          className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-left text-sm text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {m.role === "assistant" && m.id && (
                <FeedbackButtons messageId={m.id} contextSlugs={m.slugs ?? []} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={send} className="space-y-2">
        {/* Режим работы выбирает, откуда берётся ответ: из каталога или из интернета. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-stone-500">Режим</span>
          {WORK_MODES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setWorkMode(value)}
              className={[
                "rounded-full px-3 py-1 text-sm transition-colors",
                workMode === value
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200",
              ].join(" ")}
            >
              {WORK_MODE_LABELS[value]}
            </button>
          ))}
        </div>

        <p className="text-xs text-stone-500">{WORK_MODE_HINTS[workMode]}</p>

        {/* Режим ответа меняет форму ответа: коротко, по шагам или с объяснением. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-stone-500">Ответ</span>
          {MODES.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setMode(m.value)}
              className={[
                "rounded-full px-3 py-1 text-sm transition-colors",
                mode === m.value
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
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
            {loading ? PENDING_TEXT[workMode] : "Отправить"}
          </button>
        </div>
      </form>
    </div>
  );
}
