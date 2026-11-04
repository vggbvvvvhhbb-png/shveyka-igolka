"use client";

import { useState } from "react";
import { CONTACT_TOPICS, CONTACT_TOPIC_LABELS, type ContactTopic } from "@shveyka/core";
import { btnCls, inputCls } from "@/components/ui";

/** Ответ сервера. */
type SendResult = { ok: true; emailed: boolean } | { ok: false; error: string };

/** Сколько символов можно написать в обращении. */
const MAX_MESSAGE = 4000;

/** Минимальная длина обращения: совпадает с проверкой на сервере. */
const MIN_MESSAGE = 10;

/**
 * Форма обращения.
 *
 * Пишется как письмо владельцу: тема выбирается кнопками, а не вводится
 * в поле, — так письма можно разбирать по полкам. Почта для ответа
 * необязательна: человек может просто рассказать, что случилось.
 */
export function ContactForm() {
  const [topic, setTopic] = useState<ContactTopic>("suggestion");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const tooShort = message.trim().length < MIN_MESSAGE;
  const tooLong = message.trim().length > MAX_MESSAGE;

  const send = async () => {
    if (tooShort || tooLong || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          name: name.trim(),
          contact: contact.trim(),
          message: message.trim(),
          page: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; emailed: boolean }
        | { error?: string }
        | null;

      if (data && "ok" in data && data.ok) {
        setResult({ ok: true, emailed: data.emailed });
        setMessage("");
        setName("");
        setContact("");
        return;
      }
      setResult({
        ok: false,
        error:
          (data && "error" in data && data.error) ||
          "Не удалось отправить обращение, попробуйте позже.",
      });
    } catch {
      setResult({ ok: false, error: "Нет связи с сервером, попробуйте позже." });
    } finally {
      setSending(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="space-y-4 rounded-plate border border-hair bg-paper-hi p-6">
        <h2 className="text-lg font-bold text-green">Обращение принято</h2>
        <p className="text-ink-2">
          {result.emailed
            ? "Письмо отправлено на почту владельца сайта. Ответ придёт на почту, которую вы указали, — обычно в течение дня."
            : "Обращение записано и сохранено. Если нужен ответ, оставьте почту для связи и напишите ещё раз."}
        </p>
        <p className="text-sm text-ink-3">
          Спасибо, что помогаете Швейке стать понятнее. Проблемы с ответом помощника можно отметить
          прямо под его ответом — так быстрее.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink-2">О чём обращение?</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TOPICS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTopic(value)}
              aria-pressed={topic === value}
              className={[
                "rounded-plate border px-4 py-2 text-sm transition-colors",
                topic === value
                  ? "border-thread bg-thread text-paper-hi"
                  : "border-hair-2 bg-paper text-ink-2 hover:bg-wash",
              ].join(" ")}
            >
              {CONTACT_TOPIC_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink-2">Как к вам обращаться</span>
          <input
            className={inputCls}
            value={name}
            maxLength={80}
            placeholder="Аня"
            onChange={(e) => setName(e.target.value)}
          />
          <span className="block text-xs text-ink-3">Не обязательно</span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink-2">Почта для ответа</span>
          <input
            className={inputCls}
            value={contact}
            maxLength={120}
            placeholder="почта или телеграм"
            onChange={(e) => setContact(e.target.value)}
          />
          <span className="block text-xs text-ink-3">
            Не обязательно. Если оставите почту, ответ придёт прямо на неё.
          </span>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink-2">Сообщение</span>
        <textarea
          className={`${inputCls} min-h-40 resize-y`}
          value={message}
          maxLength={MAX_MESSAGE}
          placeholder="Напишите, что случилось или что стоит добавить. Чем конкретнее, тем быстрее разберёмся."
          onChange={(e) => setMessage(e.target.value)}
        />
        <span className="block text-xs text-ink-3">
          {tooShort
            ? `Ещё ${MIN_MESSAGE - message.trim().length} символов — и можно отправлять`
            : `${message.trim().length} из ${MAX_MESSAGE} символов`}
        </span>
      </label>

      {result && !result.ok && (
        <p className="rounded-plate border border-thread bg-gold-wash px-4 py-3 text-sm text-ink">
          {result.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnCls}
          disabled={tooShort || tooLong || sending}
          onClick={send}
        >
          {sending ? "Отправляем…" : "Отправить обращение"}
        </button>
        <span className="text-xs text-ink-3">
          Обращение попадает только владельцу сайта. Никаких рассылок и рекламы.
        </span>
      </div>
    </div>
  );
}
