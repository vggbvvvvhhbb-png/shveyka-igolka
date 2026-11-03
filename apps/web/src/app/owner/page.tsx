export const metadata = {
  title: "Вход владельца — Швейка",
  robots: { index: false },
};

const MESSAGES: Record<string, string> = {
  "1": "Неверный ключ.",
  "2": "Слишком много попыток. Попробуйте позже.",
};

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.OWNER_KEY);

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
