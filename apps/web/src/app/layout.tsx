import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RegisterSW } from "@/components/RegisterSW";
import { SITE_URL } from "@/lib/site";

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
    <html lang="ru">
      <body className="antialiased flex flex-col min-h-screen text-stone-800">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">{children}</main>
        <Footer />
        {/* Service worker: офлайн-каталог. Работает только в production. */}
        <RegisterSW />
      </body>
    </html>
  );
}
