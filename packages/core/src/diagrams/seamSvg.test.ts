import { describe, expect, it } from "vitest";
import { classifySeam, renderSeamSvg } from "./seamSvg";

describe("классификация швов", () => {
  it("по названию и slug", () => {
    expect(classifySeam({ name: "Потайной подгиб" })).toBe("blind");
    expect(classifySeam({ slug: "zigzag-finish" })).toBe("zigzag");
    expect(classifySeam({ name: "Французский шов" })).toBe("french");
    expect(classifySeam({ name: "Запошивочный" })).toBe("flatFelled");
    expect(classifySeam({ name: "Двойной подгиб низа" })).toBe("hem");
    expect(classifySeam({ name: "Что-то новое" })).toBe("plain");
  });

  it("потайной подгиб — не подгиб: порядок правил важен", () => {
    expect(classifySeam({ name: "Потайной подгиб" })).not.toBe("hem");
  });

  it("все 16 швов каталога получают схему", () => {
    const seams = [
      { id: "straight-seam", name: "Стачной шов (базовый)" },
      { id: "french-seam", name: "Французский шов" },
      { id: "flat-felled-seam", name: "Запошивочный шов" },
      { id: "double-turned-seam", name: "Двойной выворотной шов" },
      { id: "topstitch-seam", name: "Настрочный с отделочным швом" },
      { id: "lapped-seam", name: "Накладной с запошитым швом" },
      { id: "hem-double-fold", name: "Шов в подгибку с заутюженным швом" },
      { id: "rolled-hem", name: "Норковый шов" },
      { id: "zigzag-edge", name: "Обработка среза зигзагом" },
      { id: "bias-binding-edge", name: "Обработка среза косой бейкой" },
      { id: "gathering-two-rows", name: "Сборка ткани на две строки" },
      { id: "elastic-zigzag", name: "Притачивание резинки зигзагом" },
      { id: "buttonhole-zigzag", name: "Петля в рамку зигзагом" },
      { id: "facing-seam", name: "Обтачный шов (изнанки, манжеты, горловины)" },
      { id: "dart-stitching", name: "Стачивание вытачки" },
      { id: "understitch", name: "Закрепительная строчка на котлетке" },
    ];

    const kinds = seams.map((s) => classifySeam(s));

    // Ни один шов не должен остаться без схемы: неизвестное имя даёт «стачной».
    expect(kinds).toHaveLength(16);
    expect(kinds.every((k) => typeof k === "string" && k.length > 0)).toBe(true);

    expect(classifySeam(seams[1])).toBe("french");
    expect(classifySeam(seams[2])).toBe("flatFelled");
    expect(classifySeam(seams[3])).toBe("hem");
    expect(classifySeam(seams[4])).toBe("topstitch");
    expect(classifySeam(seams[8])).toBe("zigzag");
    expect(classifySeam(seams[9])).toBe("french");
    expect(classifySeam(seams[13])).toBe("french");
  });
});

describe("схема", () => {
  it("label экранируется", () => {
    const svg = renderSeamSvg("plain", '"><script>x</script>');
    expect(svg).not.toContain("<script>");
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("в схеме нет классов без префикса, чтобы не зацепить чужие элементы", () => {
    const svg = renderSeamSvg("hem", "Подгиб");
    expect(svg).toContain("shv-f");
    expect(svg).not.toMatch(/class="f"/);
    expect(svg).not.toMatch(/class="t"/);
  });

  it("каждый тип даёт свой svg", () => {
    const kinds = [
      "plain",
      "zigzag",
      "overlock",
      "french",
      "flatFelled",
      "hem",
      "blind",
      "topstitch",
    ] as const;

    const svgs = kinds.map((k) => renderSeamSvg(k, "Схема"));
    expect(new Set(svgs).size).toBe(kinds.length);
    for (const svg of svgs) expect(svg.startsWith("<svg")).toBe(true);
  });
});
