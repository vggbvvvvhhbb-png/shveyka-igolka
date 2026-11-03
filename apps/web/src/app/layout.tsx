import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RegisterSW } from "@/components/RegisterSW";
import { SITE_URL } from "@/lib/site";
import { fontVariables } from "./fonts";

/**
 * Тема ставится до первой отрисовки: сначала выбор из localStorage, иначе
 * системная настройка. Без этого ночная таблица моргает светлой.
 */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("shveyka-theme");var t=(s==="day"||s==="night")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"night":"day");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","day");}})();`;

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
    <html lang="ru" className={fontVariables}>
      <head>
        <Script id="shveyka-theme" strategy="beforeInteractive">
          {THEME_INIT}
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
