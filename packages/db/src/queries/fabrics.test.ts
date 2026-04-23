import { describe, it, expect } from "vitest";
import { getFabricById, listFabrics, findFabricsByAliases } from "./fabrics.js";

describe("fabrics queries", () => {
  it("exports getFabricById", () => {
    expect(typeof getFabricById).toBe("function");
  });

  it("exports listFabrics", () => {
    expect(typeof listFabrics).toBe("function");
  });

  it("exports findFabricsByAliases", () => {
    expect(typeof findFabricsByAliases).toBe("function");
  });
});
