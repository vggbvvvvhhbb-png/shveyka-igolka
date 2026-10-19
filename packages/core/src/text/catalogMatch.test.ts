import { describe, expect, it } from "vitest";
import { matchTier, rankByTier } from "./catalogMatch";

const LINEN = {
  name: "Лён",
  aliases: ["лён", "linen"],
  composition: "100% лен",
  care: "Стирка при 40°C, сушить в расправленном виде",
  issues: ["Срезы сыплются, обрабатывайте зигзагом сразу"],
};

const SUITING = {
  name: "Костюмная стрейч-ткань",
  aliases: ["костюмная стрейч"],
  composition: "Полиэстер 95%, эластан 5%",
  care: "Стирка при 40°C, быстрая сушка",
  issues: ["Эластан требует аккуратного ВТО"],
};

describe("matchTier", () => {
  it("название даёт первый уровень", () => {
    expect(matchTier(LINEN, ["лен"])).toBe(1);
  });

  it("алиас даёт первый уровень", () => {
    expect(matchTier(LINEN, ["linen"])).toBe(1);
  });

  it("состав даёт второй уровень", () => {
    expect(matchTier(SUITING, ["эластан"])).toBe(2);
  });

  it("свободный текст даёт третий уровень", () => {
    expect(matchTier(LINEN, ["расправленном"])).toBe(3);
    expect(matchTier(SUITING, ["быстрая"])).toBe(3);
  });

  it("подстрока внутри слова не считается совпадением", () => {
    // «лен» прячется в «расправленном» — совпадения быть не должно.
    expect(matchTier(LINEN, ["лен"])).toBe(1);
    expect(matchTier(SUITING, ["лен"])).toBeNull();
  });

  it("пустой запрос не совпадает ни с чем", () => {
    expect(matchTier(LINEN, [])).toBeNull();
    expect(matchTier(LINEN, ["  "])).toBeNull();
  });
});

describe("rankByTier", () => {
  it("ставит записи, найденные по названию, впереди", () => {
    const result = rankByTier([SUITING, LINEN], ["лен"]);
    expect(result.map((item) => item.name)).toEqual(["Лён"]);
  });

  it("состав идёт раньше свободного текста", () => {
    const result = rankByTier([LINEN, SUITING], ["эластан"]);
    expect(result.map((item) => item.name)).toEqual(["Костюмная стрейч-ткань"]);
  });

  it("не совпавшие записи отбрасываются", () => {
    const result = rankByTier([SUITING, LINEN], ["шёлк"]);
    expect(result).toEqual([]);
  });
});
