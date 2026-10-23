import { describe, expect, it } from "vitest";
import { createBot } from "./test/harness";
import {
  cancelWizard,
  handleWizardCallback,
  handleWizardText,
  registerWizard,
  startWizard,
  type Wizard,
} from "./wizard";

/** Тестовый сценарий: выбор, число с ограничением, несколько вариантов и текст. */
const testWizard: Wizard = {
  id: "test",
  steps: [
    {
      key: "kind",
      kind: "choice",
      text: "Что выбираем?",
      options: [
        ["Платье", "dress"],
        ["Юбка", "skirt"],
      ],
    },
    {
      key: "size",
      kind: "number",
      min: 40,
      max: 60,
      presets: [48],
      skip: { label: "Не знаю", value: 46 },
      text: "Какой размер?",
    },
    {
      key: "colors",
      kind: "multi",
      min: 1,
      text: "Какие цвета?",
      options: [
        ["Красный", "red"],
        ["Синий", "blue"],
      ],
    },
    {
      key: "note",
      kind: "text",
      text: "Заметка?",
      parse: (s) => (s.length > 0 ? { value: s } : { error: "Пусто" }),
    },
  ],
  finish: async (ctx, d) => {
    await ctx.reply(`Готово: ${JSON.stringify(d)}`);
  },
};

registerWizard(testWizard);

describe("движок диалогов", () => {
  it("задаёт первый вопрос и запоминает сценарий", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    expect(bot.log.sent).toHaveLength(1);
    expect(bot.log.sent[0]).toContain("Что выбираем?");
    expect(bot.ctx.session.wiz?.id).toBe("test");
  });

  it("идёт по шагам и в конце вызывает finish", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    await bot.press("w:dress");
    await bot.press("w:48");
    await bot.press("m:red");
    await bot.press("m:done");
    await bot.say("пояс");

    expect(bot.last()).toContain('"kind":"dress"');
    expect(bot.last()).toContain('"size":48');
    expect(bot.last()).toContain('"colors":["red"]');
    expect(bot.last()).toContain('"note":"пояс"');
    expect(bot.ctx.session.wiz).toBeUndefined();
  });

  it("сохраняет порядок вариантов в множественном выборе", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    await bot.press("w:skirt");
    await bot.press("w:48");
    await bot.press("m:blue");
    await bot.press("m:red");
    await bot.press("m:done");
    await bot.say("x");

    expect(bot.last()).toContain('"colors":["red","blue"]');
  });

  it("требует выбрать хотя бы min вариантов", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    await bot.press("w:dress");
    await bot.press("w:48");
    await bot.press("m:done");

    expect(bot.log.alerts).toContain("Выбери хотя бы 1");
    expect(bot.ctx.session.wiz?.step).toBe(2);
  });

  it("не принимает число вне диапазона", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    await bot.press("w:dress");
    await bot.say("10");

    expect(bot.log.sent.at(-1)).toContain("Минимум: 40");
    expect(bot.ctx.session.wiz?.step).toBe(1);
  });

  it("не принимает текст вместо числа", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    await bot.press("w:dress");
    await bot.say("не размер");

    expect(bot.log.sent.at(-1)).toContain("Нужно число");
    expect(bot.ctx.session.wiz?.step).toBe(1);
  });

  it("берёт значение кнопки «пропустить»", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);

    await bot.press("w:dress");
    await bot.press("w:skip");
    await bot.press("m:red");
    await bot.press("m:done");
    await bot.say("x");

    expect(bot.last()).toContain('"size":46');
  });

  it("пропускает вопрос, если не выполнено условие when", async () => {
    const bot = createBot();
    const wizard: Wizard = {
      id: "conditional",
      steps: [
        { key: "first", kind: "yesno", text: "Первый?" },
        {
          key: "second",
          kind: "text",
          when: (d) => d.first === true,
          text: "Второй?",
        },
        { key: "third", kind: "text", text: "Третий?" },
      ],
      finish: async (ctx, d) => {
        await ctx.reply(`Готово: ${JSON.stringify(d)}`);
      },
    };
    registerWizard(wizard);

    await startWizard(bot.ctx, wizard);
    await bot.press("w:n");
    await bot.say("ответ");

    expect(bot.last()).toContain("Готово");
    expect(bot.last()).not.toContain("second");
  });

  it("останавливает диалог по кнопке отмены", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);
    await bot.press("w:cancel");

    expect(bot.ctx.session.wiz).toBeUndefined();
    expect(bot.log.sent.at(-1)).toContain("Отменено");
  });

  it("отменяет диалог командой /cancel", async () => {
    const bot = createBot();
    await startWizard(bot.ctx, testWizard);
    const had = await cancelWizard(bot.ctx);

    expect(had).toBe(true);
    expect(bot.ctx.session.wiz).toBeUndefined();
  });

  it("не считает чужие нажатия своими", async () => {
    const bot = createBot();
    const handled = await handleWizardCallback(bot.ctx);

    expect(handled).toBe(false);
  });

  it("не считает обычное сообщение ответом, если диалога нет", async () => {
    const bot = createBot();
    const handled = await handleWizardText(bot.ctx);

    expect(handled).toBe(false);
  });
});
