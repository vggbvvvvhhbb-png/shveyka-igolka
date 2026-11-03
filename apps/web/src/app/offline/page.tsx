export const metadata = {
  title: "Нет сети — Швейка",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto space-y-3 py-12 text-center">
      <h1 className="text-2xl font-bold text-ink">Нет соединения</h1>
      <p className="text-ink-2 leading-relaxed">
        Эта страница ещё не сохранена на устройстве. Страницы каталога, которые вы уже открывали,
        доступны без сети.
      </p>
    </div>
  );
}
