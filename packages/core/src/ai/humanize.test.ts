import { describe, expect, it } from "vitest";
import { humanizeMachineSettings } from "./humanize";

describe("humanizeMachineSettings", () => {
  it("собирает фразу из настроек ткани", () => {
    expect(
      humanizeMachineSettings({
        needle_size: "80/12",
        stitch_type: "straight",
        stitch_length_mm: [2, 2.5],
        top_tension: [3, 5],
      })
    ).toBe(
      "Игла 80/12 (метрический №80, американский №12), прямой стежок, длина стежка 2–2,5 мм, натяжение верхней нити 3–5."
    );
  });

  it("равный диапазон схлопывается, лапка переводится на русский", () => {
    expect(humanizeMachineSettings({ top_tension: [4, 4], presser_foot: "standard" })).toBe(
      "Натяжение верхней нити 4, лапка: стандартная."
    );
  });

  it("неизвестный стежок остаётся как есть", () => {
    expect(humanizeMachineSettings({ stitch_type: "fancy_one" })).toBe("Fancy one.");
  });

  it("пустые настройки дают пустую фразу", () => {
    expect(humanizeMachineSettings({})).toBe("");
    expect(humanizeMachineSettings({ thread_material: "polyester" })).toBe("");
  });

  it("ширина стежка читается, если она есть", () => {
    expect(humanizeMachineSettings({ stitch_width_mm: [4, 6] })).toBe("Ширина стежка 4–6 мм.");
  });
});
