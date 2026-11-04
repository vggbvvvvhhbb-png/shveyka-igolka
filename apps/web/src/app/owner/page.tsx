import { cookies } from "next/headers";
import { isOwner, OWNER_COOKIE } from "@shveyka/core";
import { servicesStatus } from "@/lib/services";

export const metadata = {
  title: "Вход владельца — Швейка",
  robots: { index: false },
};

const MESSAGES: Record<string, string> = {
  "1": "Неверный ключ.",
  "2": "Слишком много попыток. Попробуйте позже.",
};

/**
 * Страница владельца.
 *
 * После входа показывает состояние внешних служб: какие ключи заданы,
 * какая модель ответила последней, требует ли провайдер ежедневной
 * проверки и настроена ли отправка писем. Это то самое объяснение,
 * которого не хватало, когда режимы с интернетом вели себя по-разному.
 */
export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.OWNER_KEY);

  const store = await cookies();
  const ownerCookie = store.get(OWNER_COOKIE)?.value;
  const loggedIn = isOwner(
    ownerCookie ? `${OWNER_COOKIE}=${ownerCookie}` : null,
    process.env.OWNER_KEY
  );

  if (loggedIn && configured) {
    const rows = servicesStatus();
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-ink">Состояние сайта</h1>
        <p className="text-ink-2 leading-relaxed">
          Видно, какие внешние службы настроены и что с ними происходит. Значения ключей здесь не
          показываются — только состояние.
        </p>

        <dl className="divide-y divide-hair border-y border-hair">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-4 gap-y-1 py-3">
              <dt className="w-full text-sm font-medium text-ink sm:w-64">{row.label}</dt>
              <dd className={`text-sm ${row.ok ? "text-ink-2" : "text-thread"}`}>{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-sm text-ink-3">
          Мерки и журнал шитья — на страницах «Мерки» и «Журнал». Они открыты по этому ключу.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-ink">Вход владельца</h1>

      {!configured ? (
        <p className="text-ink-2 leading-relaxed">
          Вход владельца не настроен — личные страницы сейчас доступны всем.
        </p>
      ) : (
        <>
          <p className="text-ink-2 leading-relaxed">
            Мерки и журнал шитья доступны только владельцу сайта. Введите ключ.
          </p>

          <form method="post" action="/api/owner" className="space-y-4">
            <label className="block text-sm font-medium text-ink">
              Ключ
              <input
                name="key"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 block w-full rounded-plate border border-hair-2 bg-paper-hi p-2"
              />
            </label>

            {error && MESSAGES[error] && (
              <p role="alert" className="text-sm text-thread">
                {MESSAGES[error]}
              </p>
            )}

            <button
              type="submit"
              className="rounded-plate bg-thread px-4 py-2 font-medium text-paper-hi hover:bg-thread-2"
            >
              Войти
            </button>
          </form>
        </>
      )}
    </div>
  );
}
