import { NextResponse } from "next/server";
import { checkLimit, OWNER_COOKIE, safeEqual } from "@shveyka/core";
import { getRateStore } from "@/lib/upstashStore";
import { SITE_URL } from "@/lib/site";

/**
 * Число попыток входа и окно, в котором они считаются.
 *
 * Подбор ключа перебирают быстро, поэтому попытки ограничены и по адресу,
 * и по времени.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_SEC = 300;

const back = (error?: "1" | "2"): NextResponse =>
  NextResponse.redirect(new URL(error ? `/owner?error=${error}` : "/", SITE_URL), 303);

/**
 * Вход владельца.
 *
 * Форма отправляет ключ, сервер проверяет его и кладёт в httpOnly-cookie.
 * Сравнение ключа — за постоянное время.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.OWNER_KEY;

  if (!secret) {
    // Вход не настроен: форма не должна появляться на сайте.
    return NextResponse.json({ error: "Вход владельца не настроен." }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = await checkLimit(
    getRateStore(),
    `owner:${ip}`,
    MAX_ATTEMPTS,
    WINDOW_SEC,
    (e) =>
      console.error("[owner] rate store is unavailable", {
        name: e instanceof Error ? e.name : "unknown",
      })
  );

  if (!allowed) return back("2");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  if (!safeEqual(String(form.get("key") ?? ""), secret)) {
    console.warn("[owner] неверный ключ", { ip });
    return back("1");
  }

  const res = back();
  res.cookies.set(OWNER_COOKIE, secret, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  return res;
}
