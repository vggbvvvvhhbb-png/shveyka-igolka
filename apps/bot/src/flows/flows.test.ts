import { describe, expect, it } from "vitest";
import { analogWizard } from "./analog";
import { careWizard, sendCareQr } from "./care";
import { cutWizard } from "./cut";
import { handleHardwareCallback, hardwareWizard } from "./hardware";
import { profitWizard, showStats } from "./profit";
import { createBot } from "../test/harness";
import { registerWizard, startWizard } from "../wizard";

registerWizard(cutWizard);
registerWizard(profitWizard);
registerWizard(analogWizard);
registerWizard(hardwareWizard);
registerWizard(careWizard);

describe("раскрой", () => {
  it("считает метраж и подсказывает, что сказать в магазине", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, cutWizard);

    await bot.press("w:dress");
    await bot.press("w:48");
    await bot.press("m:140");
    await bot.press("m:220");
    await bot.press("m:done");
    await bot.say("450 600");
    await bot.press("w:none");
    await bot.press("w:lengthwise");
    await bot.press("w:0");
    await bot.press("w:skip");

    const text = bot.last();
    expect(text).toContain("Раскрой: Платье");
    expect(text).toContain("Сколько ткани нужно");
    expect(text).toContain("Скажи в магазине");
    expect(text).toContain("140 см");
    expect(text).toContain("220 см");
    expect(text).toContain("Что учтено");
  });

  it("считает без цены, если её не знают", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, cutWizard);

    await bot.press("w:skirt");
    await bot.press("w:50");
    await bot.press("m:150");
    await bot.press("m:done");
    await bot.press("w:skip");
    await bot.press("w:none");
    await bot.press("w:lengthwise");
    await bot.press("w:0");
    await bot.press("w:skip");

    expect(bot.last()).toContain("Раскрой: Юбка");
    expect(bot.last()).toContain("150 см");
  });

  it("просит цены столько же, сколько выбрано ширин", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, cutWizard);

    await bot.press("w:dress");
    await bot.press("w:48");
    await bot.press("m:140");
    await bot.press("m:220");
    await bot.press("m:done");
    await bot.say("450");

    expect(bot.log.sent.at(-1)).toContain("Нужно 2 знач.");
  });
});

describe("выгода", () => {
  it("считает экономию и сохраняет изделие в историю", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, profitWizard);

    await bot.say("1500");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.say("5");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.say("5000");
    await bot.say("Платье");
    await bot.press("w:n");

    const text = bot.last();
    expect(text).toContain("Выгодно ли шить самой");
    expect(text).toContain("Экономия");
    expect(text).toContain("Сохранено в историю");

    expect(bot.ctx.session.projects).toHaveLength(1);
    expect(bot.ctx.session.projects[0].title).toBe("Платье");
    expect(bot.ctx.session.projects[0].gift).toBe(false);
  });

  it("показывает итоги месяца по сохранённым изделиям", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, profitWizard);

    await bot.say("1500");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.say("5");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.say("5000");
    await bot.say("Юбка");
    await bot.press("w:n");

    await showStats(bot.ctx);

    expect(bot.last()).toContain("Итоги:");
    expect(bot.last()).toContain("Сшито: 1 вещь");
    expect(bot.last()).toContain("Юбка");
  });

  it("не спрашивает про подарок, если изделие не сохранили", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, profitWizard);

    await bot.say("1500");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.say("5");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.press("w:skip");
    await bot.say("5000");
    await bot.press("w:skip");

    expect(bot.last()).toContain("Выгодно ли шить самой");
    expect(bot.ctx.session.projects).toHaveLength(0);
  });
});

describe("аналог ткани", () => {
  it("находит исходную ткань в базе и подбирает аналоги", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, analogWizard);

    await bot.say("лён");
    await bot.press("w:dress");
    await bot.press("w:summer");
    await bot.press("w:n");
    await bot.press("m:done");

    const text = bot.last();
    expect(text).toContain("Аналоги для: Лён 100%");
    expect(text).toContain("Исходная ткань");
  });

  it("объясняет, когда ткани нет в базе", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, analogWizard);

    await bot.say("несуществующая ткань");
    await bot.press("w:any");
    await bot.press("w:any");
    await bot.say("700");
    await bot.press("w:n");
    await bot.press("m:done");

    expect(bot.last()).toContain("нет в моей базе");
  });
});

describe("фурнитура", () => {
  async function fillHardware(bot: ReturnType<typeof createBot>): Promise<void> {
    await startWizard(bot.ctx, hardwareWizard);
    await bot.press("w:dress");
    await bot.press("w:48");
    await bot.press("w:buttons");
    await bot.press("w:y");
    await bot.press("w:n");
    await bot.press("w:0");
    await bot.press("w:n");
    await bot.press("w:n");
    await bot.press("w:n");
    await bot.press("w:n");
    await bot.press("w:skip");
  }

  it("выдаёт список покупок с ценами", async () => {
    const bot = createBot();
    await fillHardware(bot);

    const text = bot.last();
    expect(text).toContain("Фурнитура: Платье");
    expect(text).toContain("Пуговицы");
    expect(text).toContain("Итого купить");
  });

  it("вычёркивает то, что уже есть дома", async () => {
    const bot = createBot();
    await fillHardware(bot);

    bot.setCallback("hw:buttons");
    await handleHardwareCallback(bot.ctx);

    expect(bot.log.edited.at(-1)).toContain("есть дома");
    expect(bot.ctx.session.hw?.have).toContain("buttons");
  });

  it("убирает позицию из списка для магазина", async () => {
    const bot = createBot();
    await fillHardware(bot);

    bot.setCallback("hw:buttons");
    await handleHardwareCallback(bot.ctx);
    bot.setCallback("hw:list");
    await handleHardwareCallback(bot.ctx);

    expect(bot.log.sent.at(-1)).toContain("Список для магазина");
    expect(bot.log.sent.at(-1)).not.toContain("Пуговицы");
  });

  it("не ломается, если расчёт устарел", async () => {
    const bot = createBot();
    await handleHardwareCallback(bot.ctx);

    expect(bot.log.alerts).toContain("Расчёт устарел. Посчитай заново: /hardware");
  });
});

describe("уход за тканью", () => {
  it("разбирает состав и выдаёт инструкцию", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, careWizard);

    await bot.say("хлопок 95% эластан 5%");
    await bot.press("w:medium");
    await bot.press("w:dress");
    await bot.press("w:n");
    await bot.press("w:n");

    const text = bot.last();
    expect(text).toContain("Уход:");
    expect(text).toContain("Стирка");
    expect(text).toContain("Глажка");
    expect(text).toContain("Значки на бирке");
  });

  it("объясняет, если состав не распознан", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, careWizard);

    await bot.say("абракадабра");

    expect(bot.log.sent.at(-1)).toContain("Не получилось распознать состав");
  });

  it("присылает QR-код по кнопке", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, careWizard);

    await bot.say("лён 100%");
    await bot.press("w:medium");
    await bot.press("w:dress");
    await bot.press("w:n");
    await bot.press("w:n");

    await sendCareQr(bot.ctx);

    expect(bot.log.photos).toBe(1);
    expect(bot.ctx.session.careQr).toBeTruthy();
  });
});
