import { describe, it, expect } from "vitest";
import { getSeamById, listSeamsByType, findSeamsForFabric } from "./seams.js";

describe("seams queries", () => {
  it("exports getSeamById", () => {
    expect(typeof getSeamById).toBe("function");
  });

  it("exports listSeamsByType", () => {
    expect(typeof listSeamsByType).toBe("function");
  });

  it("exports findSeamsForFabric", () => {
    expect(typeof findSeamsForFabric).toBe("function");
  });
});
