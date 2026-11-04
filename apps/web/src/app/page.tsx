import Link from "next/link";
import { AnatomyStory } from "@/components/AnatomyStory";
import { AtlasPlate } from "@/components/AtlasPlate";
import { IntroFilm } from "@/components/IntroFilm";

/**
 * Главная — «Табл. I. Швейка».
 *
 * Плита-инфографика: титульный ряд, ряд из трёх колонок вокруг рисунка
 * машины, схема процесса, «что умеет Швейка», скролл-история «Анатомия» и
 * полоса-переход к помощнику.
 */

/** Разделы справочника: иконка в круге, название зелёным, строка и ссылка. */
const sections = [
  {
    title: "Ткани",
    description: "35 тканей с описанием, настройками машины и советами по работе.",
    href: "/fabrics",
    linkText: "Посмотреть каталог →",
    icon: "fabric" as const,
  },
  {
    title: "Швы",
    description: "16 швов с пошаговой инструкцией: от прямой строчки до подгибки.",
    href: "/seams",
    linkText: "Посмотреть каталог →",
    icon: "seam" as const,
  },
  {
    title: "Проекты",
    description:
      "6 готовых проектов — от наволочки до постельного комплекта. С расчётом расхода ткани.",
    href: "/projects",
    linkText: "Посмотреть каталог →",
    icon: "project" as const,
  },
];

/** Плотность ткани: четыре класса, как цветовая классификация кружками. */
const density = [
  { label: "Лёгкая", filled: 1 },
  { label: "Средняя", filled: 2 },
  { label: "Плотная", filled: 3 },
  { label: "Очень плотная", filled: 4 },
];

/** Путь от ткани до изделия — пять шагов, соединённых пунктирной нитью. */
const steps = [
  { title: "Выбор ткани" },
  { title: "Раскрой" },
  { title: "Строчка" },
  { title: "Утюжка" },
  { title: "Готово" },
];

/** Что умеет Швейка — четыре колонки. */
const abilities = [
  { title: "Первое", text: "Подобрать ткань по каталогу: состав, плетение и плотность." },
  { title: "Второе", text: "Настроить машину: игла, длина стежка, натяжение, лапка." },
  { title: "Третье", text: "Рассчитать расход ткани на раскрой — с запасом на припуски." },
  { title: "Четвёртое", text: "Узнать уход «как на бирке, только подробнее»." },
];

/** Иконки разделов: тонкие линии, как на всей плите. */
function SectionIcon({ name }: { name: (typeof sections)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {name === "fabric" && (
          <>
            <rect x="4" y="5" width="16" height="14" rx="1" />
            <path d="M4 10.5h16M9 5v14M15 5v14" />
          </>
        )}
        {name === "seam" && (
          <>
            <path d="M3 12h4l2-4 2.5 8 2.5-6 2 2h5" />
            <path d="M20 4v4l-2.5-1.5" />
          </>
        )}
        {name === "project" && (
          <>
            <path d="M6 4h8l4 4v12H6z" />
            <path d="M14 4v4h4" />
            <path d="M9 12h6M9 15.5h4" strokeDasharray="2 2" />
          </>
        )}
      </g>
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Заставка: раз за сессию, поверх всей страницы. */}
      <IntroFilm />

      <div className="space-y-12">
        {/* РЯД A — титул и разделы справочника */}
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

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {sections.map((s) => (
              <div key={s.title} className="card-plate flex flex-col items-start p-6">
                <span className="atlas-calc__icon mb-3">
                  <SectionIcon name={s.icon} />
                </span>
                <h2 className="font-title text-2xl font-bold text-green">{s.title}</h2>
                <p className="mt-2 flex-1 leading-relaxed text-ink-2">{s.description}</p>
                <Link
                  href={s.href}
                  className="stitch-link mt-4 inline-flex items-center gap-1 font-medium"
                >
                  {s.linkText}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* РЯД B — плита в три колонки вокруг рисунка машины */}
        <AtlasPlate />

        {/* РЯД C — схема процесса и плотность ткани */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div>
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
          </div>

          <aside>
            <h2 className="plate-label drip mb-3">Плотность ткани</h2>
            <ul className="space-y-2">
              {density.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-3 w-3 rounded-full border ${
                          i < item.filled ? "border-gold bg-gold" : "border-hair-2 bg-transparent"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="text-sm text-ink-2">{item.label}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        {/* РЯД D — что умеет Швейка */}
        <section>
          <h2 className="plate-label drip mb-5">Что умеет Швейка</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {abilities.map((item) => (
              <div key={item.title} className="card-plate p-5">
                <span className="font-latin text-lg italic text-thread">{item.title}</span>
                <p className="mt-2 leading-relaxed text-ink-2">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Скролл-история «Анатомия»: восемь деталей машины одна за другой */}
        <AnatomyStory />

        {/* Витрина образцов: гербарный лист нивяника. */}
        <section className="atlas-vitrine">
          <div className="atlas-vitrine__text">
            <h2 className="plate-label drip">Образец 1</h2>
            <p className="mt-3 font-title text-2xl font-bold text-green">Нивяник обыкновенный</p>
            <p className="plate-latin mt-1 text-lg">Leucanthemum vulgare</p>
          </div>

          <figure className="atlas-vitrine__plate">
            <img
              src="/images/oxeye-daisy.jpg"
              alt="Гербарный лист нивяника обыкновенного: белый цветок с жёлтой сердцевиной, два бутона и зелёные листья на тёмном фоне"
              width={760}
              height={1018}
              loading="lazy"
              decoding="async"
            />
          </figure>
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
    </>
  );
}
