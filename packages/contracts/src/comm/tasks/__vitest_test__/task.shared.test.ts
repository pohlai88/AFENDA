import { describe, expect, it } from "vitest";
import {
  TaskContextEntityTypeSchema,
  TaskDescriptionSchema,
  TaskNumberSchema,
  TaskTitleSchema,
} from "../task.shared.js";

describe("task.shared", () => {
  it("parses trimmed title and number", () => {
    expect(TaskTitleSchema.parse("  Investigate timeout  ")).toBe("Investigate timeout");
    expect(TaskNumberSchema.parse("  TASK-101  ")).toBe("TASK-101");
  });

  it("rejects invalid bounds", () => {
    expect(TaskContextEntityTypeSchema.safeParse(" ").success).toBe(false);
    expect(TaskDescriptionSchema.safeParse("x".repeat(20_001)).success).toBe(false);
  });
});
