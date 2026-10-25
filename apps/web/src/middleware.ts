import { NextResponse, type NextRequest } from "next/server";
import { isOwner } from "@shveyka/core";

/**
 * Личные страницы — только владельцу.
 *
 * Мерки — одна запись на всех: если её может переписать любой посетитель,
 * помощник потом подставит чужие мерки в ответы. Замок минимальный: один
 * владелец, один ключ, никаких аккаунтов.
 *
 * Без OWNER_KEY middleware пропускает всё — поведение «как раньше».
 */
export function middleware(req: NextRequest) {
  if (isOwner(req.headers.get("cookie"), process.env.OWNER_KEY)) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Эти данные доступны только владельцу." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/owner", req.nextUrl.origin));
}

export const config = {
  // Личные маршруты. Журнал шитья в каталоге пока нет, но путь закрыт заранее:
  // когда появится, он не откроется наружу по умолчанию.
  matcher: [
    "/api/measurements/:path*",
    "/api/sewn/:path*",
    "/measurements/:path*",
    "/journal/:path*",
  ],
};
