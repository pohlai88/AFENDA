import { describe, expect, it } from "vitest";
import {
  ProjectColorSchema,
  ProjectDescriptionSchema,
  ProjectNameSchema,
} from "../project.shared.js";

describe("project.shared", () => {
  it("parses trimmed project name", () => {
    const parsed = ProjectNameSchema.parse("  Q2 Migration  ");
    expect(parsed).toBe("Q2 Migration");
  });

  it("accepts valid hex color", () => {
    expect(ProjectColorSchema.safeParse("#12ABef").success).toBe(true);
  });

  it("rejects invalid color and overlong description", () => {
    expect(ProjectColorSchema.safeParse("blue").success).toBe(false);
    expect(ProjectDescriptionSchema.safeParse("x".repeat(20_001)).success).toBe(false);
  });
});
