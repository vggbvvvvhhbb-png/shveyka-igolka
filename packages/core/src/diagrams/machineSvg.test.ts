import { describe, expect, it } from "vitest";
import {
  MACHINE_PARTS,
  MACHINE_SHAPES,
  MACHINE_STEPS,
  MACHINE_VIEWBOX,
  getMachinePart,
  renderMachineSvg,
} from "./machineSvg";

describe("схема машины", () => {
  it("начинается с svg и содержит viewBox", () => {
    const svg = renderMachineSvg();
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${MACHINE_VIEWBOX.width} ${MACHINE_VIEWBOX.height}"`);
  });

  it("у каждой детали есть группа с id и data-part", () => {
    const svg = renderMachineSvg();
    for (const shape of MACHINE_SHAPES) {
      expect(svg).toContain(`id="shv-m-${shape.id}"`);
      expect(svg).toContain(`data-part="${shape.id}"`);
    }
  });

  it("восемь выносок, как в брифе", () => {
    expect(MACHINE_PARTS).toHaveLength(8);
    expect(MACHINE_PARTS.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("выноски указывают на разные детали", () => {
    const ids = MACHINE_PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у каждой выноски есть подпись, пояснение и ссылка", () => {
    for (const part of MACHINE_PARTS) {
      expect(part.label.length).toBeGreaterThan(0);
      expect(part.note.length).toBeGreaterThan(0);
      expect(part.href.startsWith("/")).toBe(true);
    }
  });

  it("выноска попадает в рисунок", () => {
    for (const part of MACHINE_PARTS) {
      expect(part.anchor.x).toBeGreaterThan(0);
      expect(part.anchor.x).toBeLessThan(MACHINE_VIEWBOX.width);
      expect(part.anchor.y).toBeGreaterThan(0);
      expect(part.anchor.y).toBeLessThan(MACHINE_VIEWBOX.height);
      expect(part.labelPoint.x).toBeGreaterThan(0);
      expect(part.labelPoint.x).toBeLessThan(MACHINE_VIEWBOX.width);
    }
  });

  it("шагов истории столько же, сколько выносок", () => {
    expect(MACHINE_STEPS).toHaveLength(MACHINE_PARTS.length);
    for (const step of MACHINE_STEPS) {
      expect(getMachinePart(step.part)).toBeDefined();
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.text.length).toBeGreaterThan(0);
    }
  });

  it("нить разбита на отрезки и привязана к длине пути", () => {
    const svg = renderMachineSvg();
    const threads = svg.match(/class="shv-m-thread" pathLength="1"/g) ?? [];
    expect(threads.length).toBe(5);
  });

  it("в схеме нет классов без префикса shv-m-", () => {
    const svg = renderMachineSvg();
    const classes = [...svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
    for (const name of classes) {
      expect(name.startsWith("shv-m-")).toBe(true);
    }
  });

  it("подпись схемы экранируется", () => {
    const svg = renderMachineSvg({ title: '"><script>x</script>' });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&quot;&gt;&lt;script&gt;");
  });
});
