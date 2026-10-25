import Link from "next/link";

const sections = [
  {
    title: "Ткани",
    description: "35 тканей с описанием, настройками машины и советами по работе.",
    href: "/fabrics",
    linkText: "Посмотреть каталог →",
    active: true,
  },
  {
    title: "Швы",
    description: "16 швов с пошаговой инструкцией: от прямой строчки до подгибки.",
    href: "/seams",
    linkText: "Посмотреть каталог →",
    active: true,
  },
  {
    title: "Проекты",
    description:
      "6 готовых проектов — от наволочки до постельного комплекта. С расчётом расхода ткани.",
    href: "/projects",
    linkText: "Посмотреть каталог →",
    active: true,
  },
  {
    title: "Помощник Швейка",
    description:
      "AI-консультант ответит на вопросы по шитью и поможет выбрать ткань по каталогу Швейки.",
    href: "/assistant",
    linkText: "Спросить →",
    active: true,
  },
];

const calculators = [
  {
    title: "Раскрой",
    description: "Сколько метров ткани брать и какая ширина рулона выгоднее.",
    href: "/calculator",
  },
  {
    title: "Выгода",
    description: "Своё изделие против цены в магазине: полная себестоимость.",
    href: "/profit",
  },
  {
    title: "Аналог ткани",
    description: "Подберём похожую ткань подешевле и покажем отличия.",
    href: "/analog",
  },
  {
    title: "Фурнитура",
    description: "Список покупок: пуговицы, молнии, нитки и резинки.",
    href: "/hardware",
  },
  {
    title: "Уход",
    description: "Инструкция по уходу по составу ткани — как на бирке.",
    href: "/care",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold text-stone-900">Швейка</h1>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Справочник по тканям, швам и проектам — всё для шитья на домашней машине.
        </p>
        <div>
          <Link
            href="/start"
            className="inline-block rounded-lg bg-orange-700 px-5 py-2.5 font-medium text-white hover:bg-orange-800"
          >
            С чего начать
          </Link>
        </div>
      </section>

      {/* Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-stone-200 bg-white p-6 flex flex-col gap-3 transition-colors hover:bg-stone-50"
          >
            <h2 className="text-xl font-semibold text-stone-900">{s.title}</h2>
            <p className="text-stone-600 leading-relaxed flex-1">{s.description}</p>
            {s.active && s.href ? (
              <Link
                href={s.href}
                className="text-stone-800 font-medium hover:text-stone-600 inline-flex items-center gap-1"
              >
                {s.linkText}
              </Link>
            ) : (
              <span className="text-stone-500 inline-flex items-center gap-1">{s.linkText}</span>
            )}
          </div>
        ))}
      </section>

      {/* Калькуляторы */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-stone-900">Калькуляторы</h2>
          <p className="text-stone-600">Считают сами — помощник зовётся, если нужно уточнить.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {calculators.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-2 transition-colors hover:bg-stone-50"
            >
              <span className="text-lg font-semibold text-stone-900">{c.title}</span>
              <span className="text-stone-600 leading-relaxed">{c.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
