import { describe, expect, it } from "vitest";
import { buildHardware, estimateTotal, shoppingText, type HardwareInput } from "./hardware";

const baseInput: HardwareInput = {
  garment: "dress",
  size: 48,
  closure: "buttons",
  longSleeve: false,
  collar: false,
  pockets: 0,
  hood: false,
  elasticWaist: false,
  elasticCuffs: false,
  overlock: false,
  contrastTopstitch: false,
};

function item(items: ReturnType<typeof buildHardware>, id: string) {
  return items.find((x) => x.id === id);
}

describe("buildHardware", () => {
  it("считает пуговицы с запасом на два", () => {
    const items = buildHardware(baseInput);
    const buttons = item(items, "buttons");

    expect(buttons?.qty).toBe("8 шт");
    expect(buttons?.note).toContain("основные 6");
  });

  it("добавляет пуговицы на манжеты длинного рукава", () => {
    const items = buildHardware({ ...baseInput, longSleeve: true });
    const buttons = item(items, "buttons");

    expect(buttons?.qty).toBe("12 шт");
    expect(buttons?.note).toContain("манжеты 4");
  });

  it("не добавляет пуговицы на манжеты, если манжеты на резинке", () => {
    const items = buildHardware({
      ...baseInput,
      longSleeve: true,
      elasticCuffs: true,
    });

    expect(item(items, "buttons")?.qty).toBe("8 шт");
  });

  it("подбирает длину молнии под изделие", () => {
    expect(item(buildHardware({ ...baseInput, closure: "zipper" }), "zipper")?.qty).toBe("60 см");
    expect(
      item(buildHardware({ ...baseInput, garment: "coat", closure: "zipper" }), "zipper")?.qty
    ).toBe("75 см");
  });

  it("учитывает размер в длине молнии", () => {
    const small = buildHardware({ ...baseInput, garment: "coat", size: 44, closure: "zipper" });
    const large = buildHardware({ ...baseInput, garment: "coat", size: 56, closure: "zipper" });

    expect(item(small, "zipper")?.qty).not.toBe(item(large, "zipper")?.qty);
  });

  it("считает резинку на пояс по размеру", () => {
    const items = buildHardware({
      ...baseInput,
      garment: "skirt",
      elasticWaist: true,
    });

    expect(item(items, "elastic-waist")?.qty).toBe("78 см");
  });

  it("всегда добавляет основные нитки и уважает оверлок", () => {
    const withoutOverlock = buildHardware(baseInput);
    const withOverlock = buildHardware({ ...baseInput, overlock: true });

    expect(item(withoutOverlock, "thread-main")).toBeDefined();
    expect(item(withoutOverlock, "thread-overlock")).toBeUndefined();
    expect(item(withOverlock, "thread-overlock")?.qty).toBe("4 катушки");
  });

  it("берёт две катушки ниток для пальто и пиджака", () => {
    const items = buildHardware({ ...baseInput, garment: "coat" });

    expect(item(items, "thread-main")?.qty).toContain("2 катушки");
  });

  it("подсказывает нитки в тон названному цвету", () => {
    const items = buildHardware({ ...baseInput, fabricColor: "изумрудный" });

    expect(item(items, "thread-main")?.note).toContain("изумрудный");
  });

  it("добавляет дублирин на воротник", () => {
    const items = buildHardware({ ...baseInput, collar: true });

    expect(item(items, "interfacing")?.qty).toBe("0,25 м");
  });
});

describe("shoppingText", () => {
  it("убирает из списка то, что уже есть дома", () => {
    const items = buildHardware(baseInput);
    const text = shoppingText(items, ["buttons"]);

    expect(text).not.toContain("Пуговицы");
    expect(text).toContain("Нитки основные");
  });

  it("пишет, что всё уже есть, если ничего не нужно", () => {
    const items = buildHardware(baseInput);
    const text = shoppingText(
      items,
      items.map((x) => x.id)
    );

    expect(text).toContain("уже есть дома");
  });
});

describe("estimateTotal", () => {
  it("складывает цены только нужных позиций", () => {
    const items = buildHardware(baseInput);
    const [lo, hi] = estimateTotal(items, []);

    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(lo);
  });

  it("уменьшает сумму, если часть вещей уже есть", () => {
    const items = buildHardware(baseInput);
    const [loAll] = estimateTotal(items, []);
    const [loSome] = estimateTotal(items, ["thread-main"]);

    expect(loSome).toBeLessThan(loAll);
  });
});
