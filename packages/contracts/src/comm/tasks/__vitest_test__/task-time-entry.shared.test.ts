import { describe, expect, it } from "vitest";
import {
  TaskTimeEntryDescriptionSchema,
  TaskTimeEntryMinutesSchema,
} from "../task-time-entry.shared.js";

describe("task-time-entry.shared", () => {
  it("parses positive minutes and trimmed description", () => {
    expect(TaskTimeEntryMinutesSchema.parse(15)).toBe(15);
    expect(TaskTimeEntryDescriptionSchema.parse("  Deep dive  ")).toBe("Deep dive");
  });

  it("rejects invalid minutes", () => {
    expect(TaskTimeEntryMinutesSchema.safeParse(0).success).toBe(false);
  });
});
