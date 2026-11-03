import Link from "next/link";

/**
 * Главная — «Табл. I. Швейка».
 *
 * Плита-инфографика: крупный заголовок, курсивная строка, разделы
 * справочника, схема процесса «от ткани до изделия» и полоса-переход
 * к помощнику.
 */

const sections = [
  {
    title: "Ткани",
    description: "35 тканей с описанием, настройками машины и советами по работе.",
    href: "/fabrics",
    linkText: "Посмотреть каталог →",
  },
  {
    title: "Швы",
    description: "16 швов с пошаговой инструкцией: от прямой строчки до подгибки.",
    href: "/seams",
    linkText: "Посмотреть каталог →",
  },
  {
    title: "Проекты",
    description:
      "6 готовых проектов — от наволочки до постельного комплекта. С расчётом расхода ткани.",
    href: "/projects",
    linkText: "Посмотреть каталог →",
  },
  {
    title: "Помощник Швейка",
    description:
      "AI-консультант ответит на вопросы по шитью и поможет выбрать ткань по каталогу Швейки.",
    href: "/assistant",
    linkText: "Спросить →",
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

/** Путь от ткани до изделия — пять шагов, соединённых пунктирной нитью. */
const steps = [
  { title: "Выбор ткани" },
  { title: "Раскрой" },
  { title: "Строчка" },
  { title: "Утюжка" },
  { title: "Готово" },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Табл. I — титул */}
      <section className="border-b border-hair pb-10 pt-6 text-center">
        <p className="plate-label justify-center">Табл. I</p>

        <h1 className="title-write mt-4 font-title text-6xl font-black text-green md:text-8xl">
          Швейка
        </h1>

        <p className="plate-latin mt-3">Acus et Filum · Ars sartoria domestica</p>

        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
          Справочник по тканям, швам и проектам — всё для шитья на домашней машине.
        </p>

        <div className="mt-7">
          <Link
            href="/start"
            className="inline-block rounded-plate bg-thread px-6 py-2.5 font-medium text-paper-hi transition-colors hover:bg-thread-2"
          >
            С чего начать
          </Link>
        </div>
      </section>

      {/* Разделы справочника */}
      <section>
        <h2 className="plate-label drip mb-5">Разделы справочника</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title} className="card-plate flex flex-col p-6">
              <h3 className="font-title text-2xl font-bold text-green">{s.title}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-ink-2">{s.description}</p>
              <Link
                href={s.href}
                className="stitch-link mt-4 inline-flex items-center gap-1 self-start font-medium"
              >
                {s.linkText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Калькуляторы */}
      <section>
        <h2 className="plate-label drip mb-2">Калькуляторы</h2>
        <p className="mb-5 text-ink-3">Считают сами — помощник зовётся, если нужно уточнить.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {calculators.map((c) => (
            <Link key={c.href} href={c.href} className="card-plate p-5">
              <span className="font-title text-xl font-bold text-green">{c.title}</span>
              <span className="mt-1 block leading-relaxed text-ink-2">{c.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* От ткани до изделия */}
      <section>
        <h2 className="plate-label drip mb-5">От ткани до изделия</h2>
        <div className="relative">
          {/* Пунктирная нить соединяет шаги — как строчка на ткани. */}
          <div
            className="absolute left-[10%] right-[10%] top-1/2 hidden border-t border-dashed border-thread sm:block"
            aria-hidden="true"
          />
          <ol className="relative grid grid-cols-2 gap-4 sm:grid-cols-5">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-plate border border-hair bg-paper-hi p-3 text-center"
              >
                <span className="font-latin text-lg italic text-thread">
                  {index + 1}. {step.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Переход к помощнику */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-plate border border-hair bg-paper-hi px-6 py-5 sm:flex-row sm:items-center">
        <p className="max-w-xl leading-relaxed text-ink-2">
          Помощник отвечает по каталогу Швейки: по ткани, по шву, по настройкам машины.
        </p>
        <Link
          href="/assistant"
          className="inline-flex shrink-0 items-center gap-2 rounded-plate bg-thread px-5 py-2 font-medium text-paper-hi transition-colors hover:bg-thread-2"
        >
          Спросить помощника
        </Link>
      </section>
    </div>
  );
}
