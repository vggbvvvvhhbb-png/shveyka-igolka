import { describe, expect, it } from "vitest";
import { countPhrase, pluralRu } from "./plural";

const FABRIC_FORMS = ["ткань", "ткани", "тканей"] as const;

describe("pluralRu", () => {
  it("выбирает форму для одного", () => {
    expect(pluralRu(1, FABRIC_FORMS)).toBe("ткань");
  });

  it("выбирает форму для двух, трёх и четырёх", () => {
    expect(pluralRu(2, FABRIC_FORMS)).toBe("ткани");
    expect(pluralRu(3, FABRIC_FORMS)).toBe("ткани");
    expect(pluralRu(4, FABRIC_FORMS)).toBe("ткани");
  });

  it("выбирает форму для пяти и больше", () => {
    expect(pluralRu(5, FABRIC_FORMS)).toBe("тканей");
    expect(pluralRu(11, FABRIC_FORMS)).toBe("тканей");
    expect(pluralRu(101, FABRIC_FORMS)).toBe("ткань");
  });

  it("учитывает последние две цифры числа", () => {
    expect(pluralRu(21, FABRIC_FORMS)).toBe("ткань");
    expect(pluralRu(22, FABRIC_FORMS)).toBe("ткани");
    expect(pluralRu(25, FABRIC_FORMS)).toBe("тканей");
    expect(pluralRu(111, FABRIC_FORMS)).toBe("тканей");
    expect(pluralRu(112, FABRIC_FORMS)).toBe("тканей");
    expect(pluralRu(114, FABRIC_FORMS)).toBe("тканей");
  });

  it("нулевое число даёт форму множественного числа", () => {
    expect(pluralRu(0, FABRIC_FORMS)).toBe("тканей");
  });
});

describe("countPhrase", () => {
  it("пишет число вместе со склонённым словом", () => {
    expect(countPhrase(1, FABRIC_FORMS)).toBe("1 ткань");
    expect(countPhrase(2, FABRIC_FORMS)).toBe("2 ткани");
    expect(countPhrase(35, FABRIC_FORMS)).toBe("35 тканей");
  });
});
