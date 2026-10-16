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
      "AI-консультант ответит на вопросы по шитью и поможет выбрать ткань. Появится в следующих обновлениях.",
    href: null,
    linkText: "Скоро →",
    active: false,
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
    </div>
  );
}
