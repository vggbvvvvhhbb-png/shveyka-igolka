import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Швейка — справочник по шитью",
  description: "Ткани, швы и проекты для домашней швейной машины Brother LS-200s",
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
        <main className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
