import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { Card, PageShell, SectionLabel } from "@/components/ui";
import { contactEmail } from "@/lib/mail";

export const metadata: Metadata = {
  title: "Контакты для обращения — Швейка",
  description:
    "Напишите владельцу Швейки: предложение, жалоба или ошибка на сайте. Форма отправляет обращение прямо на почту.",
  alternates: { canonical: "/contacts" },
};

/**
 * Страница обращений.
 *
 * Здесь человек пишет владельцу: предложение, жалобу или заметку об
 * ошибке. Обращение уходит письмом на почту, привязанную к сайту, и
 * остаётся в базе — письмо не потеряется.
 */
export default function ContactsPage() {
  return (
    <PageShell
      title="Контакты для обращения"
      latin="Epistola · Замечания и предложения"
      subtitle="Напишите, что не так или что добавить. Если нужна помощь с самим шитьём — спросите помощника: он отвечает по каталогу и по интернету."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card title="Форма обращения">
          <ContactForm />
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionLabel>Как это работает</SectionLabel>
            <ol className="space-y-2 text-sm text-ink-2">
              <li>1. Выбираете тему и пишете, что случилось.</li>
              <li>2. Обращение уходит письмом владельцу сайта.</li>
              <li>3. Ответ приходит на почту, если вы её оставили.</li>
            </ol>
            <p className="text-sm text-ink-2">
              Письма приходят на <span className="font-latin text-ink">{contactEmail()}</span>.
              Можно написать и на эту почту напрямую.
            </p>
          </Card>

          <Card>
            <SectionLabel>Что можно написать</SectionLabel>
            <ul className="space-y-2 text-sm text-ink-2">
              <li>— добавить ткань, шов или проект в справочник;</li>
              <li>— поправить настройки машины, если они не сходятся;</li>
              <li>— сообщить, что страница не открывается или считает не то;</li>
              <li>— сказать, что в ответе помощника не хватило деталей.</li>
            </ul>
          </Card>

          <Card>
            <SectionLabel>Ещё спросить</SectionLabel>
            <p className="text-sm text-ink-2">
              Правила сайта и помощника — с лимитами и тем, что он умеет, — описаны отдельно.
            </p>
            <Link
              href="/rules"
              className="text-sm font-medium text-green underline-offset-4 hover:underline"
            >
              Правила сайта и помощника
            </Link>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
