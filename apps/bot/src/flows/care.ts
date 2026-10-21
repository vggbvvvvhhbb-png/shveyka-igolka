import { InlineKeyboard, InputFile } from "grammy";
import QRCode from "qrcode";
import {
  CARE_DENSITY_LABELS,
  CARE_GARMENT_LABELS,
  generateCare,
  parseComposition,
  type CareDensity,
  type CareGarment,
  type CareIconSpec,
} from "@shveyka/core/calculator/care";
import { config } from "../config";
import { esc, section } from "../lib/html";
import { aiLink, sendHtml } from "../lib/reply";
import { oneOf } from "../lib/values";
import type { MyContext } from "../session";
import { opts, type Wizard } from "../wizard";

const ICON_EMOJI: Record<CareIconSpec["kind"], string> = {
  wash: "🧺",
  bleach: "🔺",
  tumble: "🌀",
  iron: "♨️",
  dryclean: "🧴",
};

/** Уход за тканью: как стирать, сушить, гладить и хранить. */
export const careWizard: Wizard = {
  id: "care",
  steps: [
    {
      key: "fibers",
      kind: "text",
      text:
        "🧼 <b>Уход за тканью</b>\n\nНапиши состав, как на бирке: " +
        "<code>хлопок 95% + эластан 5%</code>, <code>лён 100%</code> " +
        "или просто «шерстяное пальто».",
      parse: (s) => {
        const fibers = parseComposition(s);
        if (fibers.length === 0) {
          return {
            error:
              "Не получилось распознать состав. Попробуй так: «хлопок 100%» или «шерсть 80% акрил 20%».",
          };
        }
        return { value: fibers };
      },
    },
    {
      key: "density",
      kind: "choice",
      cols: 3,
      text: "Какая плотность ткани?",
      options: opts(CARE_DENSITY_LABELS),
    },
    {
      key: "garment",
      kind: "choice",
      cols: 3,
      text: "Что за изделие?",
      options: opts(CARE_GARMENT_LABELS),
    },
    {
      key: "pile",
      kind: "yesno",
      text: "Есть ворс? (бархат, велюр, махра)",
    },
    {
      key: "print",
      kind: "yesno",
      text: "Есть принт или вышивка?",
    },
  ],

  finish: async (ctx, d) => {
    const care = generateCare({
      fibers: Array.isArray(d.fibers) ? d.fibers : [],
      density: oneOf<CareDensity>(d, "density", CARE_DENSITY_LABELS, "medium"),
      garment: oneOf<CareGarment>(d, "garment", CARE_GARMENT_LABELS, "other"),
      pile: d.pile === true,
      print: d.print === true,
    });
    ctx.session.careQr = care.qrText;

    const icons = care.icons
      .map((ic) => `${ic.forbidden ? "🚫" : ICON_EMOJI[ic.kind]} ${esc(ic.label)}`)
      .join("\n");

    const html = [
      `🧼 <b>Уход: ${esc(care.title)}</b>`,
      ...care.warnings.map((w) => `⚠️ <b>Важно:</b> ${esc(w)}`),
      `<b>Значки на бирке</b>\n${icons}`,
      section("Стирка", care.wash),
      section("Сушка", care.dry),
      section("Глажка", care.iron),
      section("Хранение", care.storage),
      section("Ремонт и восстановление", care.repair),
      section("⏰ Напоминания", care.reminders),
    ]
      .filter(Boolean)
      .join("\n\n");

    const kb = new InlineKeyboard().text("🔳 QR-код на изделие", "care:qr").row();
    if (config.siteUrl) {
      kb.url(
        "🤖 Уточнить у помощника",
        aiLink(`Составь подробную инструкцию по уходу за тканью: ${care.title}.`)
      ).row();
    }
    kb.text("🔁 Заново", "menu:care").text("🏠 Меню", "menu:home");

    await sendHtml(ctx, html, kb);
  },
};

/** Кнопка «QR-код»: присылает картинку с краткой инструкцией. */
export async function sendCareQr(ctx: MyContext): Promise<void> {
  await ctx.answerCallbackQuery();
  const text = ctx.session.careQr;
  if (!text) {
    await ctx.reply("Сначала составь инструкцию: /care");
    return;
  }
  const png = await QRCode.toBuffer(text, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  await ctx.replyWithPhoto(new InputFile(png, "care-qr.png"), {
    caption:
      "🔳 Распечатай и приклей к изделию. Если отсканировать, откроется краткая инструкция по уходу.",
  });
}
