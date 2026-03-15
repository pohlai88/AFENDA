import { describe, expect, it } from "vitest";
import { TaskChecklistItemTextSchema } from "../task-checklist-item.shared.js";

describe("task-checklist-item.shared", () => {
  it("parses trimmed checklist item text", () => {
    expect(TaskChecklistItemTextSchema.parse("  Send follow-up  ")).toBe("Send follow-up");
  });

  it("rejects empty text", () => {
    expect(TaskChecklistItemTextSchema.safeParse("   ").success).toBe(false);
  });
});
