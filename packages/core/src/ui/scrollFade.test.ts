import { describe, expect, it } from "vitest";
import { scrollFadeEdges } from "./scrollFade";

describe("scrollFadeEdges", () => {
  it("не приглушает края, если строка помещается целиком", () => {
    expect(scrollFadeEdges({ scrollWidth: 600, clientWidth: 600, scrollLeft: 0 })).toEqual({
      left: false,
      right: false,
    });
  });

  it("приглушает правый край, если справа есть ещё содержимое", () => {
    expect(scrollFadeEdges({ scrollWidth: 900, clientWidth: 600, scrollLeft: 0 })).toEqual({
      left: false,
      right: true,
    });
  });

  it("приглушает оба края, когда строка прокручена в середине", () => {
    expect(scrollFadeEdges({ scrollWidth: 900, clientWidth: 600, scrollLeft: 150 })).toEqual({
      left: true,
      right: true,
    });
  });

  it("не приглушает правый край, когда дошли до конца", () => {
    expect(scrollFadeEdges({ scrollWidth: 900, clientWidth: 600, scrollLeft: 300 })).toEqual({
      left: true,
      right: false,
    });
  });

  it("не приглушает левый край в начале строки", () => {
    expect(scrollFadeEdges({ scrollWidth: 900, clientWidth: 600, scrollLeft: 0 })).toEqual({
      left: false,
      right: true,
    });
  });

  it("терпит дробные размеры вёрстки", () => {
    // Разница в пол-пикселя — это не прокрутка, край мигать не должен.
    expect(scrollFadeEdges({ scrollWidth: 600.5, clientWidth: 600, scrollLeft: 0 })).toEqual({
      left: false,
      right: false,
    });
    expect(scrollFadeEdges({ scrollWidth: 900, clientWidth: 600, scrollLeft: 299.5 })).toEqual({
      left: true,
      right: false,
    });
  });

  it("пустая строка не даёт приглушения", () => {
    expect(scrollFadeEdges({ scrollWidth: 0, clientWidth: 0, scrollLeft: 0 })).toEqual({
      left: false,
      right: false,
    });
  });
});
