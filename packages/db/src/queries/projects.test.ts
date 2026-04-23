import { describe, it, expect } from "vitest";
import { getProjectById, listProjectsByDifficulty, getProjectWithResolvedRefs } from "./projects.js";

describe("projects queries", () => {
  it("exports getProjectById", () => {
    expect(typeof getProjectById).toBe("function");
  });

  it("exports listProjectsByDifficulty", () => {
    expect(typeof listProjectsByDifficulty).toBe("function");
  });

  it("exports getProjectWithResolvedRefs", () => {
    expect(typeof getProjectWithResolvedRefs).toBe("function");
  });
});
