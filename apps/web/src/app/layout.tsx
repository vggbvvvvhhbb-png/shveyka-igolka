import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";
import "./intro.css";
import "./atlas.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RegisterSW } from "@/components/RegisterSW";
import { SITE_URL } from "@/lib/site";
import { INTRO_SEEN_KEY } from "@/lib/intro";
import { fontVariables } from "./fonts";

/**
 * Тема ставится до первой отрисовки: сначала выбор из localStorage, иначе
 * системная настройка. Без этого ночная таблица моргает светлой.
 */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("shveyka-theme");var t=(s==="day"||s==="night")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"night":"day");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","day");}})();`;

/**
 * Заставка решается до первой отрисовки: показывать её или сразу спрятать.
 * Отметка живёт в sessionStorage — за сессию заставка нужна один раз.
 * Ссылка «Показать заставку снова» открывает главную с ?intro=1.
 */
const INTRO_INIT = `(function(){try{if(new URLSearchParams(location.search).get("intro")==="1"){document.documentElement.setAttribute("data-intro","on");return;}document.documentElement.setAttribute("data-intro",sessionStorage.getItem(${JSON.stringify(
  INTRO_SEEN_KEY
)})?"off":"on");}catch(e){document.documentElement.setAttribute("data-intro","on");}})();`;

export const metadata: Metadata = {
  // Без metadataBase относительные ссылки превращаются в localhost:3000.
  metadataBase: new URL(SITE_URL),
  title: "Швейка — справочник по шитью",
  description: "Ткани, швы и проекты для домашней швейной машины Brother LS-200s",
  manifest: "/manifest.webmanifest",
  applicationName: "Швейка",
  appleWebApp: {
    capable: true,
    title: "Швейка",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    // suppressHydrationWarning: скрипт темы ставит data-theme на <html>
    // до гидрации, и без этого React ругается на несовпадение атрибутов.
    <html lang="ru" className={fontVariables} suppressHydrationWarning>
      <head>
        <Script id="shveyka-theme" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        <Script id="shveyka-intro" strategy="beforeInteractive">
          {INTRO_INIT}
        </Script>
      </head>
      <body className="antialiased flex flex-col min-h-screen text-ink">
        <Header />
        <main className="plate-flow max-w-5xl mx-auto px-4 py-8 w-full flex-1">{children}</main>
        <Footer />
        {/* Service worker: офлайн-каталог. Работает только в production. */}
        <RegisterSW />
      </body>
    </html>
  );
}
