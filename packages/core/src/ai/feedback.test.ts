import { describe, it, expect } from "vitest";
import { validateFeedback } from "./feedback";

describe("validateFeedback", () => {
  it("принимает оценку без комментария", () => {
    expect(validateFeedback({ messageId: "m1", rating: "up" })).toEqual({
      ok: true,
      value: { messageId: "m1", rating: "up", comment: null, contextSlugs: [] },
    });
  });

  it("обрезает пробелы и пустой комментарий превращает в null", () => {
    const r = validateFeedback({ messageId: "m1", rating: "down", comment: "   " });
    expect(r.ok && r.value.comment).toBeNull();
  });

  it("отбрасывает мусорные slug, остальные оставляет", () => {
    const r = validateFeedback({
      messageId: "m1",
      rating: "down",
      contextSlugs: ["fabrics/denim", "<script>", 5, "seams/flat-felled-seam"],
    });
    expect(r.ok && r.value.contextSlugs).toEqual(["fabrics/denim", "seams/flat-felled-seam"]);
  });

  it.each([
    [null],
    [{ rating: "up" }],
    [{ messageId: "m1", rating: "meh" }],
    [{ messageId: "m1", rating: "up", comment: 5 }],
    [{ messageId: "m1", rating: "up", comment: "x".repeat(501) }],
  ])("отклоняет %j", (body) => {
    expect(validateFeedback(body).ok).toBe(false);
  });
});
