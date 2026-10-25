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
      <h1 className="text-2xl font-bold text-stone-900">Вход владельца</h1>

      {!configured ? (
        <p className="text-stone-600 leading-relaxed">
          Вход владельца не настроен — личные страницы сейчас доступны всем.
        </p>
      ) : (
        <>
          <p className="text-stone-600 leading-relaxed">
            Мерки и журнал шитья доступны только владельцу сайта. Введите ключ.
          </p>

          <form method="post" action="/api/owner" className="space-y-4">
            <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
              Ключ
              <input
                name="key"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 dark:border-stone-700 dark:bg-stone-900"
              />
            </label>

            {error && MESSAGES[error] && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {MESSAGES[error]}
              </p>
            )}

            <button
              type="submit"
              className="rounded-lg bg-orange-700 px-4 py-2 font-medium text-white hover:bg-orange-800"
            >
              Войти
            </button>
          </form>
        </>
      )}
    </div>
  );
}
