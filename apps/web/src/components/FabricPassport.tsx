import Link from "next/link";
import { FOOT_LABELS, STITCH_LABELS, formatRange, typeLabel } from "@shveyka/core";
import { WeaveFigure } from "@/components/WeaveFigure";

/**
 * Паспорт ткани: плита-инфографика в три колонки.
 *
 * Слева — описание, настройки машины и заметка мастера; в центре — плетение с
 * выносками и линейкой-масштабом; справа — работа с тканью, предостережение и
 * уход. Внизу — схема «как шить эту ткань» и плотность.
 *
 * Все подписи взяты из записи каталога: состав, уход, типичные проблемы и
 * настройки машины. Ничего не выдумывается — если в записи нет указаний,
 * это прямо написано.
 */

/** Настройки машины из записи ткани. */
export type PassportSettings = {
  needle_type?: string;
  needle_size?: string | string[];
  stitch_type?: string;
  stitch_length_mm?: number[];
  top_tension?: number[];
  presser_foot?: string;
  notes?: string;
};

/** Данные ткани, нужные паспорту. */
export type PassportFabric = {
  name: string;
  aliases: string[];
  composition: string;
  category: string;
  weight_class: string;
  stretch: string;
  difficulty_to_work_with: string;
  density_min_gsm: number;
  density_max_gsm: number;
  shrinkage_percent: number;
  requires_decatizing: boolean;
  care_instructions: string;
  common_issues: string[];
  default_machine_settings: PassportSettings;
};

/** Шов, которым обрабатывают срез ткани. */
export type PassportEdgeSeam = { name: string; href: string };

const CATEGORY_LABELS: Record<string, string> = {
  natural: "Натуральная",
  synthetic: "Синтетическая",
  blend: "Смесовая",
};

const WEIGHT_LABELS: Record<string, string> = {
  light: "Лёгкая",
  medium: "Средняя",
  heavy: "Тяжёлая",
  very_heavy: "Очень тяжёлая",
};

/** Сколько кружков плотности заполнено: по одной на ступень веса. */
const WEIGHT_DOTS: Record<string, number> = {
  light: 1,
  medium: 2,
  heavy: 3,
  very_heavy: 4,
};

const STRETCH_LABELS: Record<string, string> = {
  none: "Нет",
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Легко работать",
  intermediate: "Средняя сложность",
  advanced: "Сложно работать",
};

/** Порядковые числительные: пункты описания идут словами, а не цифрами. */
const ORDINALS = ["Первое", "Второе", "Третье", "Четвёртое", "Пятое", "Шестое"];

/** Первая буква заглавная: строка из инструкции становится самостоятельной фразой. */
function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

/** Знак ухода: что означает символ в кружке. */
type CareSymbol = "wash" | "dry" | "iron" | "bleach" | "note";

/** Правила разбора инструкции по уходу: первое совпадение и есть тема пункта. */
const CARE_RULES: readonly { symbol: CareSymbol; re: RegExp }[] = [
  { symbol: "wash", re: /стирк|мыть|моч|протирать/i },
  { symbol: "dry", re: /суш/i },
  { symbol: "iron", re: /глаж|гладит|утюг|вто|пар/i },
  { symbol: "bleach", re: /отбелива|химчистк/i },
];

/**
 * Пункты инструкции по уходу.
 *
 * Фразы разбираются по запятым, а «или» разделяет варианты: «ручная стирка
 * или химчистка» — это два разных указания.
 */
function careClauses(text: string): string[] {
  return text
    .split(/[,;]/)
    .flatMap((part) => part.split(/\s+или\s+/i))
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter((part) => part.length > 0);
}

/** Знак ухода с подписью из инструкции. */
type CareItem = { symbol: CareSymbol; caption: string };

/**
 * Четыре знака ухода: стирка, сушка, глажка и то, что осталось.
 *
 * Если темы в инструкции нет, подпись прямо говорит, что её не указали.
 */
function careSymbols(care: string): CareItem[] {
  const clauses = careClauses(care);
  const used = new Set<string>();

  const take = (symbol: CareSymbol): CareItem => {
    const rule = CARE_RULES.find((item) => item.symbol === symbol);
    const found = rule
      ? clauses.find((clause) => rule.re.test(clause) && !used.has(clause))
      : undefined;
    if (found) used.add(found);
    return { symbol, caption: found ?? "" };
  };

  const wash = take("wash");
  const dry = take("dry");
  const iron = take("iron");

  // Четвёртый знак — то, что осталось: отбеливание или общее правило ухода.
  const rest = clauses.find((clause) => !used.has(clause));
  const bleachRule = CARE_RULES.find((item) => item.symbol === "bleach");
  const extra: CareItem = rest
    ? { symbol: bleachRule?.re.test(rest) ? "bleach" : "note", caption: capitalize(rest) }
    : { symbol: "note", caption: "" };

  return [
    { ...wash, caption: capitalize(wash.caption) },
    { ...dry, caption: capitalize(dry.caption) },
    { ...iron, caption: capitalize(iron.caption) },
    extra,
  ];
}

/**
 * Пункты описания: всё берётся из записи, ничего не додумывается.
 *
 * Первая типичная проблема уходит в заметку мастера, поэтому здесь её нет.
 */
function descriptionItems(fabric: PassportFabric): string[] {
  return [
    `состав: ${fabric.composition}.`,
    `уход: ${fabric.care_instructions}`,
    ...fabric.common_issues.slice(1),
  ];
}

/**
 * Подходящая фраза из типичных проблем.
 *
 * Сначала ищутся не первые проблемы: первая стоит в заметке мастера, и
 * повторять её в каждом разделе незачем.
 */
function issueMatching(issues: string[], re: RegExp): string | null {
  return (
    issues.slice(1).find((issue) => re.test(issue)) ??
    issues.find((issue) => re.test(issue)) ??
    null
  );
}

/** Игла словами: тип и размер. */
function needleLine(settings: PassportSettings): string | null {
  const type = typeLabel(settings.needle_type);
  const size = Array.isArray(settings.needle_size)
    ? settings.needle_size.join(", ")
    : settings.needle_size;
  const parts = [type, size].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Лапка словами. */
function footLine(settings: PassportSettings): string | null {
  if (!settings.presser_foot) return null;
  return FOOT_LABELS[settings.presser_foot] ?? settings.presser_foot;
}

/** Значение настройки: «универсальная, 80/12», «2–2,5 мм», «3–4». */
function settingValue(key: keyof PassportSettings, settings: PassportSettings): string | null {
  switch (key) {
    case "needle_type":
      return needleLine(settings);
    case "stitch_length_mm": {
      const length = formatRange(settings.stitch_length_mm);
      return length ? `${length} мм` : null;
    }
    case "top_tension": {
      const tension = formatRange(settings.top_tension);
      return tension ?? null;
    }
    case "presser_foot":
      return footLine(settings);
    default:
      return null;
  }
}

/** Растягивается ли ткань: низкой растяжимости для этого мало. */
function stretches(fabric: PassportFabric): boolean {
  return fabric.stretch === "medium" || fabric.stretch === "high";
}

/** Раскрой: по усадке, растяжимости и типичным проблемам. */
function cuttingLine(fabric: PassportFabric): string {
  if (fabric.shrinkage_percent > 0 || fabric.requires_decatizing) {
    return `Декатируйте ткань до раскроя: усадка до ${fabric.shrinkage_percent}%.`;
  }
  if (stretches(fabric)) {
    return "Ткань тянется: кроите, не растягивая её.";
  }
  return (
    issueMatching(fabric.common_issues, /скользит|складк|раскро|декатир/) ??
    "Кроите по выкройке, не растягивая ткань."
  );
}

/** Утюжка: из инструкции по уходу, а если там нет — из типичных проблем. */
function ironingLine(fabric: PassportFabric): string {
  const clause = careClauses(fabric.care_instructions).find((item) =>
    /глаж|гладит|утюг|вто|пар/i.test(item)
  );
  if (clause) return capitalize(clause);
  const issue = issueMatching(fabric.common_issues, /вто|глаж|утюг|мят|залом/i);
  return issue ? capitalize(issue) : "Глажка — по инструкции к изделию.";
}

/** Строчка: из типичных проблем, а если их нет — из настроек машины. */
function stitchLine(fabric: PassportFabric): string {
  const issue = issueMatching(fabric.common_issues, /строчк|лапк|зигзаг|шов|стел|шв/i);
  if (issue) return issue;

  const settings = fabric.default_machine_settings;
  const stitch = settings.stitch_type
    ? (STITCH_LABELS[settings.stitch_type] ?? settings.stitch_type)
    : "прямой стежок";
  const length = formatRange(settings.stitch_length_mm);
  const tension = formatRange(settings.top_tension);
  const parts = [
    stitch,
    length ? `длина стежка ${length} мм` : null,
    tension ? `натяжение ${tension}` : null,
  ].filter((part): part is string => !!part);

  return `${capitalize(parts.join(", "))}.`;
}

/** Предостережение: то, что важно знать до раскроя. */
function cautionLine(fabric: PassportFabric): string {
  if (fabric.shrinkage_percent > 0) {
    return `Усадка до ${fabric.shrinkage_percent}% — декатируйте ткань до раскроя.`;
  }
  if (stretches(fabric)) {
    return "Ткань тянется: не тяните её под лапкой, дайте машине продвигать.";
  }
  return (
    issueMatching(
      fabric.common_issues,
      /усадк|сып|осып|скольз|лин|ворс|прокол|зацеп|топорщ|мят|пятн/i
    ) ?? "Срезы обрабатывайте сразу после раскроя."
  );
}

/** Шаг схемы шитья. */
type SewingStep = {
  title: string;
  text: string;
  links?: PassportEdgeSeam[];
};

/** Схема «как шить эту ткань»: шаги из данных записи. */
function sewingSteps(fabric: PassportFabric, edgeSeams: PassportEdgeSeam[]): SewingStep[] {
  const settings = fabric.default_machine_settings;
  const steps: SewingStep[] = [];

  steps.push(
    fabric.shrinkage_percent > 0 || fabric.requires_decatizing
      ? {
          title: "Подготовка",
          text: `Декатируйте ткань: усадка до ${fabric.shrinkage_percent}%.`,
        }
      : { title: "Подготовка", text: "Выгладите ткань перед раскроем." }
  );

  const needle = needleLine(settings);
  const foot = footLine(settings);
  steps.push({
    title: "Игла и лапка",
    text:
      [needle, foot ? `лапка — ${foot}` : null]
        .filter((part): part is string => !!part)
        .join("; ") || "Игла и лапка — по записи ткани.",
  });

  steps.push({ title: "Строчка", text: stitchLine(fabric) });

  steps.push({
    title: "Срезы",
    text:
      issueMatching(fabric.common_issues, /сып|осып|рассыпа|края/) ??
      "Обработайте срез сразу после раскроя.",
    links: edgeSeams.length > 0 ? edgeSeams : undefined,
  });

  steps.push({ title: "Утюжка", text: ironingLine(fabric) });

  return steps.slice(0, 5);
}

/** Иконка настройки машины: своя рисунка, без значков-эмодзи. */
function SettingIcon({ kind }: { kind: "needle" | "stitch" | "tension" | "foot" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "needle" && (
        <>
          <path d="M12 3v13" />
          <path d="M12 16l-1.5 5h3z" />
          <circle cx="12" cy="6.5" r="1.4" />
        </>
      )}
      {kind === "stitch" && (
        <>
          <path d="M5 8v8M19 8v8" />
          <path d="M5 12h14" strokeDasharray="2.5 3" />
        </>
      )}
      {kind === "tension" && (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 12l3.2-3.2" />
          <path d="M12 5v1.6M19 12h-1.6M12 19v-1.6M5 12h1.6" />
        </>
      )}
      {kind === "foot" && (
        <>
          <path d="M12 3v8" />
          <path d="M7 11h10l-2 8H9z" />
        </>
      )}
    </svg>
  );
}

/** Знак ухода: стирка, сушка, глажка, отбеливание и общее правило. */
function CareIcon({ symbol }: { symbol: CareSymbol }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {symbol === "wash" && (
        <>
          <path d="M3 9h18l-2 10H5z" />
          <path d="M6.5 6c1.2 1.2 2.4 1.2 3.6 0s2.4-1.2 3.6 0 2.4 1.2 3.6 0" />
        </>
      )}
      {symbol === "dry" && (
        <>
          <path d="M12 4a2 2 0 1 1 2 2" />
          <path d="M12 6v4" />
          <path d="M12 10L4 16h16z" />
        </>
      )}
      {symbol === "iron" && (
        <>
          <path d="M3 19h18l-4-9H8z" />
          <path d="M10 10V6h5" />
        </>
      )}
      {symbol === "bleach" && <path d="M12 4l8.5 16h-17z" />}
      {symbol === "note" && (
        <>
          <path d="M4 6h9l7 6-7 6H4z" />
          <path d="M8 12h6" />
        </>
      )}
    </svg>
  );
}

/** Стрелка-стежка между шагами схемы. */
function StepArrow() {
  return (
    <svg
      className="fabric-passport-step-arrow"
      viewBox="0 0 40 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6h28" strokeDasharray="4 3" />
      <path d="M29 2.6L36 6l-7 3.4" />
    </svg>
  );
}

export function FabricPassport({
  fabric,
  edgeSeams,
}: {
  fabric: PassportFabric;
  edgeSeams: PassportEdgeSeam[];
}) {
  const settings = fabric.default_machine_settings;
  const items = descriptionItems(fabric);
  const care = careSymbols(fabric.care_instructions);
  const steps = sewingSteps(fabric, edgeSeams);
  const dots = WEIGHT_DOTS[fabric.weight_class] ?? 1;
  const variants = fabric.aliases.slice(0, 3);

  const settingRows: {
    key: keyof PassportSettings;
    label: string;
    icon: "needle" | "stitch" | "tension" | "foot";
  }[] = [
    { key: "needle_type", label: "Игла", icon: "needle" },
    { key: "stitch_length_mm", label: "Длина стежка", icon: "stitch" },
    { key: "top_tension", label: "Натяжение", icon: "tension" },
    { key: "presser_foot", label: "Лапка", icon: "foot" },
  ];

  return (
    <div className="fabric-passport">
      {/* Ряд A: имя, состав и виды ткани. */}
      <header className="fabric-passport-head">
        <p className="plate-label">Паспорт ткани</p>
        <h1 className="font-title text-4xl font-bold text-green md:text-5xl">{fabric.name}</h1>
        <p className="plate-latin">{fabric.composition}</p>

        {variants.length > 0 && (
          <ul className="fabric-passport-variants">
            {variants.map((variant) => (
              <li key={variant} className="fabric-passport-variant">
                {variant}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <span className="fabric-passport-chip">
            {CATEGORY_LABELS[fabric.category] ?? fabric.category}
          </span>
          <span className="fabric-passport-chip">
            {WEIGHT_LABELS[fabric.weight_class] ?? fabric.weight_class}
          </span>
          <span className="fabric-passport-chip">
            Растяжимость: {STRETCH_LABELS[fabric.stretch] ?? fabric.stretch}
          </span>
          <span className="fabric-passport-chip">
            {DIFFICULTY_LABELS[fabric.difficulty_to_work_with] ?? fabric.difficulty_to_work_with}
          </span>
        </div>
      </header>

      {/* Три колонки плиты. */}
      <div className="fabric-passport-grid">
        {/* Левая колонка. */}
        <div className="fabric-passport-col fabric-passport-col-left">
          <section className="fabric-passport-block">
            <h2 className="fabric-passport-title">Описание</h2>
            <ol className="fabric-passport-list">
              {items.map((item, index) => (
                <li key={index}>
                  <span className="fabric-passport-ordinal">
                    {ORDINALS[index] ?? `${index + 1}`}
                  </span>{" "}
                  — {item}
                </li>
              ))}
            </ol>
          </section>

          <section className="fabric-passport-block">
            <h2 className="fabric-passport-title">Настройки машины</h2>
            <ul className="fabric-passport-settings">
              {settingRows.map((row) => {
                const value = settingValue(row.key, settings);
                if (!value) return null;
                return (
                  <li key={row.key} className="fabric-passport-setting">
                    <span className="fabric-passport-setting-icon">
                      <SettingIcon kind={row.icon} />
                    </span>
                    <span className="fabric-passport-setting-text">
                      <span className="fabric-passport-setting-label">{row.label}</span>
                      <span className="fabric-passport-setting-value">{value}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="fabric-passport-block">
            <h2 className="fabric-passport-title">Из заметок мастера</h2>
            <blockquote className="fabric-passport-quote">
              {fabric.common_issues[0] ?? fabric.care_instructions}
            </blockquote>
          </section>
        </div>

        {/* Центр: плетение. */}
        <div className="fabric-passport-col fabric-passport-col-center">
          <h2 className="fabric-passport-title fabric-passport-title--center">Плетение</h2>
          <WeaveFigure name={fabric.name} composition={fabric.composition} />
        </div>

        {/* Правая колонка. */}
        <div className="fabric-passport-col fabric-passport-col-right">
          <section className="fabric-passport-block">
            <h2 className="fabric-passport-title">Работа с тканью</h2>
            <dl className="fabric-passport-work">
              <dt>Раскрой</dt>
              <dd>{cuttingLine(fabric)}</dd>
              <dt>Утюжка</dt>
              <dd>{ironingLine(fabric)}</dd>
              <dt>Строчка</dt>
              <dd>{stitchLine(fabric)}</dd>
            </dl>
          </section>

          <section className="fabric-passport-block">
            <h2 className="fabric-passport-title">Осторожно</h2>
            <p className="fabric-passport-caution">{cautionLine(fabric)}</p>
          </section>

          <section className="fabric-passport-block">
            <h2 className="fabric-passport-title">Уход</h2>
            <ul className="fabric-passport-care">
              {care.map((item) => (
                <li key={item.symbol} className="fabric-passport-care-item">
                  <span
                    className="fabric-passport-care-icon"
                    data-empty={item.caption ? undefined : "true"}
                  >
                    <CareIcon symbol={item.symbol} />
                  </span>
                  <span className="fabric-passport-care-caption">
                    {item.caption || "В инструкции не указано"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Ряд C: схема шитья и плотность. */}
      <div className="fabric-passport-row-c">
        <section className="fabric-passport-col fabric-passport-col-steps">
          <h2 className="fabric-passport-title">Как шить эту ткань</h2>
          <ol className="fabric-passport-steps">
            {steps.map((step, index) => (
              <li key={step.title} className="fabric-passport-step-item">
                <div className="fabric-passport-step">
                  <span className="fabric-passport-step-number">{index + 1}</span>
                  <span className="fabric-passport-step-title">{step.title}</span>
                  <span className="fabric-passport-step-text">{step.text}</span>
                  {step.links && step.links.length > 0 && (
                    <span className="fabric-passport-step-links">
                      {step.links.map((seam) => (
                        <Link key={seam.href} href={seam.href} className="stitch-link">
                          {seam.name}
                        </Link>
                      ))}
                    </span>
                  )}
                </div>
                {index < steps.length - 1 && <StepArrow />}
              </li>
            ))}
          </ol>
        </section>

        <section className="fabric-passport-col fabric-passport-col-density">
          <h2 className="fabric-passport-title">Плотность</h2>
          <div className="fabric-passport-density-dots" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={
                  step <= dots
                    ? "fabric-passport-dot fabric-passport-dot--on"
                    : "fabric-passport-dot"
                }
              />
            ))}
          </div>
          <p className="fabric-passport-density-label">
            {WEIGHT_LABELS[fabric.weight_class] ?? fabric.weight_class}
          </p>
          <p className="fabric-passport-density-value">
            {fabric.density_min_gsm}–{fabric.density_max_gsm} г/м²
          </p>
        </section>
      </div>
    </div>
  );
}
