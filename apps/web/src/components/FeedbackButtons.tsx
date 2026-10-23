"use client";

import { useState } from "react";

type Rating = "up" | "down";

const COMMENT_MAX = 500;

/**
 * Оценка ответа помощника: «полезно» / «не то» и необязательный комментарий.
 * Оценка уходит сразу, комментарий дописывается отдельным запросом: так ничего
 * не теряется, если человек не стал ничего писать.
 */
export function FeedbackButtons({
  messageId,
  contextSlugs,
}: {
  messageId: string;
  contextSlugs: string[];
}) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextRating: Rating, nextComment: string | null): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          rating: nextRating,
          comment: nextComment,
          contextSlugs,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Не удалось сохранить оценку");
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить оценку");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function rate(next: Rating) {
    if (busy || next === rating) return;
    if (await submit(next, null)) {
      setRating(next);
      setCommentSent(false);
    }
  }

  async function sendComment() {
    if (!rating || !comment.trim()) return;
    if (await submit(rating, comment)) setCommentSent(true);
  }

  const button = (value: Rating, label: string) => (
    <button
      type="button"
      onClick={() => void rate(value)}
      disabled={busy}
      aria-pressed={rating === value}
      className={`rounded-full border px-3 py-1 text-sm disabled:opacity-40 ${
        rating === value
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-300 text-stone-600 hover:border-stone-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mr-auto max-w-[85%] space-y-2 pl-1">
      <div className="flex flex-wrap items-center gap-2">
        {button("up", "Полезно")}
        {button("down", "Не то")}
        {rating && !error && <span className="text-sm text-stone-500">Спасибо за оценку</span>}
      </div>

      {rating === "down" && !commentSent && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
            rows={2}
            placeholder="Что не так? Необязательно"
            className="w-full rounded-xl border border-stone-300 bg-white p-2 text-sm text-stone-800 focus:outline-none focus:border-stone-500"
          />
          <button
            type="button"
            onClick={() => void sendComment()}
            disabled={busy || comment.trim().length === 0}
            className="rounded-full bg-stone-900 px-4 py-1 text-sm text-white disabled:opacity-40 hover:bg-stone-700"
          >
            Отправить комментарий
          </button>
        </div>
      )}
      {commentSent && <p className="text-sm text-stone-500">Комментарий отправлен</p>}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
