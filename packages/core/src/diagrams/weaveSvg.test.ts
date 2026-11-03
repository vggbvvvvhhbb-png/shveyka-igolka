import { describe, expect, it } from "vitest";
import { classifyWeave, renderWeaveSvg, renderWeaveTile } from "./weaveSvg";

/** Все виды переплетения: по одному на каждый тип. */
const KINDS = ["plain", "twill", "satin", "knit", "rib", "velvet", "gauze"] as const;

/** Имена тканей каталога: у каждой должно быть своё переплетение. */
const FABRICS = [
  "Поплин хлопковый",
  "Сатин (хлопковый)",
  "Бязь",
  "Фланель",
  "Батист",
  "Муслин",
  "Сорочечный хлопок (шамбре)",
  "Хлопок-стрейч",
  "Лён",
  "Шёлк натуральный",
  "Шерсть костюмная",
  "Твид",
  "Трикотаж кулирная гладь",
  "Интерлок",
  "Футер двухнитка",
  "Рибана (ластик)",
  "Джинса (деним)",
  "Канвас (парусина)",
  "Вельвет",
  "Габардин",
  "Костюмная стрейч-ткань",
  "Шифон",
  "Органза",
  "Креп-сатин",
  "Вискоза плательная",
  "Атлас (шёлковый/ацетатный)",
  "Тафта",
  "Жаккард",
  "Флис",
  "Бархат",
  "Экокожа",
  "Стеганая ткань (с утеплителем)",
  "Сетка/Тюль",
  "Кружево",
  "Подкладочная ткань",
];

/** Все классы из разметки: проверяем префикс shv-. */
const classesOf = (svg: string): string[] =>
  [...svg.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));

describe("классификация плетения", () => {
  it("по названию ткани", () => {
    expect(classifyWeave({ name: "Поплин хлопковый" })).toBe("plain");
    expect(classifyWeave({ name: "Джинса (деним)" })).toBe("twill");
    expect(classifyWeave({ name: "Атлас (шёлковый/ацетатный)" })).toBe("satin");
    expect(classifyWeave({ name: "Трикотаж кулирная гладь" })).toBe("knit");
    expect(classifyWeave({ name: "Рибана (ластик)" })).toBe("rib");
    expect(classifyWeave({ name: "Бархат" })).toBe("velvet");
    expect(classifyWeave({ name: "Сетка/Тюль" })).toBe("gauze");
  });

  it("по составу и узору", () => {
    expect(classifyWeave({ name: "Ткань", composition: "100% хлопок" })).toBe("plain");
    expect(classifyWeave({ name: "Ткань", composition: "Полиэстер 90% / эластан 10%" })).toBe(
      "plain"
    );
    expect(classifyWeave({ name: "Ткань", pattern: "ёлочка" })).toBe("twill");
    expect(classifyWeave({ name: "Ткань", pattern: null })).toBe("plain");
  });

  it("неизвестная ткань — полотняное плетение", () => {
    expect(classifyWeave({ name: "Что-то новое" })).toBe("plain");
    expect(classifyWeave({})).toBe("plain");
  });

  it("порядок правил: резинка важнее трикотажа, бархат важнее сатина", () => {
    expect(classifyWeave({ name: "Рибана (ластик)" })).not.toBe("knit");
    expect(classifyWeave({ name: "Бархат сатиновый" })).toBe("velvet");
  });

  it("все ткани каталога получают плетение", () => {
    const kinds = FABRICS.map((name) => classifyWeave({ name }));

    expect(kinds).toHaveLength(35);
    expect(kinds.every((k) => KINDS.includes(k))).toBe(true);

    expect(classifyWeave({ name: FABRICS[1] })).toBe("satin");
    expect(classifyWeave({ name: FABRICS[11] })).toBe("twill");
    expect(classifyWeave({ name: FABRICS[12] })).toBe("knit");
    expect(classifyWeave({ name: FABRICS[15] })).toBe("rib");
    expect(classifyWeave({ name: FABRICS[18] })).toBe("velvet");
    expect(classifyWeave({ name: FABRICS[32] })).toBe("gauze");
  });
});

describe("иллюстрация плетения", () => {
  it("каждый вид даёт непустой svg", () => {
    for (const kind of KINDS) {
      const svg = renderWeaveSvg(kind);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg.length).toBeGreaterThan(200);
    }
  });

  it("виды отличаются друг от друга", () => {
    const svgs = KINDS.map((k) => renderWeaveSvg(k));
    expect(new Set(svgs).size).toBe(KINDS.length);
  });

  it("переданные цвета попадают в разметку", () => {
    const svg = renderWeaveSvg("plain", { warp: "#ff0000", weft: "#00ff00" });
    expect(svg).toContain("#ff0000");
    expect(svg).toContain("#00ff00");
  });

  it("размер и число нитей учитываются", () => {
    const svg = renderWeaveSvg("plain", { width: 200, height: 100, threads: 8 });
    expect(svg).toContain('viewBox="0 0 200 100"');
  });

  it("в разметке нет классов без префикса, чтобы не зацепить чужие элементы", () => {
    for (const kind of KINDS) {
      const svg = renderWeaveSvg(kind);
      const classes = classesOf(svg);
      expect(classes.length).toBeGreaterThan(0);
      for (const cls of classes) expect(cls.startsWith("shv-")).toBe(true);
    }
  });

  it("в стилях схемы тоже только классы с префиксом", () => {
    const svg = renderWeaveSvg("satin");
    const selectors = [...svg.matchAll(/\.([a-zA-Z][\w-]*)\{/g)].map((m) => m[1]);
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.startsWith("shv-")).toBe(true);
  });

  it("цвет не ломает разметку", () => {
    const svg = renderWeaveSvg("plain", { warp: '"><script>alert(1)</script>' });
    expect(svg).not.toContain("<script>");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("название ткани не попадает в разметку", () => {
    const kind = classifyWeave({ name: '"><script>alert(1)</script>' });
    const svg = renderWeaveSvg(kind);
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("alert(1)");
  });
});

describe("слои иллюстрации", () => {
  it("в сатине есть долевая нить", () => {
    expect(renderWeaveSvg("satin")).toContain('class="shv-w-float"');
  });

  it("в сарже есть диагональ под 45°", () => {
    expect(renderWeaveSvg("twill")).toContain('class="shv-w-diagonal"');
  });

  it("диагональ рисуется только у саржи", () => {
    for (const kind of KINDS.filter((k) => k !== "twill")) {
      expect(renderWeaveSvg(kind)).not.toContain('class="shv-w-diagonal"');
    }
  });

  it("в бархате есть ворс", () => {
    expect(renderWeaveSvg("velvet")).toContain('class="shv-w-nap"');
  });

  it("у полотняного плетения есть кромка", () => {
    expect(renderWeaveSvg("plain")).toContain('class="shv-w-selvedge"');
  });

  it("кромка есть у всех видов плетения", () => {
    for (const kind of KINDS) {
      expect(renderWeaveSvg(kind)).toContain('class="shv-w-selvedge"');
    }
  });

  it("кромка идёт вдоль обоих краёв полотна", () => {
    const svg = renderWeaveSvg("plain", { width: 200, height: 100, threads: 8 });
    const band = /class="shv-w-selvedge-band"[^>]*x="([\d.]+)"/g;
    const xs = [...svg.matchAll(band)].map((m) => Number(m[1]));
    expect(xs.length).toBe(2);
    // Одна полоса у левого края, другая — у правого.
    expect(xs[0]).toBe(0);
    expect(xs[1]).toBeGreaterThan(100);
  });

  it("диагональ идёт под 45°: по горизонтали столько же, сколько по вертикали", () => {
    const svg = renderWeaveSvg("twill", { width: 200, height: 100, threads: 8 });
    const line = /class="shv-w-diagonal-line" d="M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)"/;
    const match = svg.match(line);
    expect(match).not.toBeNull();
    const dx = Number(match?.[3]) - Number(match?.[1]);
    const dy = Number(match?.[4]) - Number(match?.[2]);
    expect(Math.abs(dx)).toBeCloseTo(Math.abs(dy), 5);
  });
});

describe("плитка узора", () => {
  it("каждый вид даёт непустой svg", () => {
    for (const kind of KINDS) {
      const svg = renderWeaveTile(kind);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg.length).toBeGreaterThan(100);
    }
  });

  it("виды отличаются друг от друга", () => {
    const tiles = KINDS.map((k) => renderWeaveTile(k));
    expect(new Set(tiles).size).toBe(KINDS.length);
  });

  it("плитка прозрачная: фон страницы должен быть виден", () => {
    for (const kind of KINDS) {
      const svg = renderWeaveTile(kind);
      expect(svg).not.toContain("shv-w-bg");
      expect(svg).not.toContain("shv-w-frame");
    }
  });

  it("плитка без кромки и диагонали: краёв у повторяющегося узора нет", () => {
    for (const kind of KINDS) {
      const svg = renderWeaveTile(kind);
      expect(svg).not.toContain('class="shv-w-selvedge"');
      expect(svg).not.toContain('class="shv-w-diagonal"');
    }
  });

  it("нити выходят за край плитки, иначе стык будет виден", () => {
    for (const kind of KINDS) {
      // Отрицательная координата означает, что нить уходит за край плитки.
      expect(renderWeaveTile(kind)).toMatch(/-\d/);
    }
  });

  it("цвета подставляются", () => {
    const svg = renderWeaveTile("gauze", { warp: "#ff0000", weft: "#0000ff" });
    expect(svg).toContain("#ff0000");
    expect(svg).toContain("#0000ff");
  });

  it("в разметке нет классов без префикса", () => {
    for (const kind of KINDS) {
      for (const cls of classesOf(renderWeaveTile(kind))) expect(cls.startsWith("shv-")).toBe(true);
    }
  });
});
