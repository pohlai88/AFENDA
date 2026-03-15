import { describe, expect, it } from "vitest";
import {
  WorkflowDescriptionSchema,
  WorkflowNameSchema,
  WorkflowRunErrorSchema,
} from "../workflow.shared.js";

describe("workflow.shared", () => {
  it("parses trimmed workflow name", () => {
    const parsed = WorkflowNameSchema.parse("  AP Auto Escalation  ");
    expect(parsed).toBe("AP Auto Escalation");
  });

  it("rejects empty run error and overlong description", () => {
    expect(WorkflowRunErrorSchema.safeParse("   ").success).toBe(false);
    expect(WorkflowDescriptionSchema.safeParse("x".repeat(2_001)).success).toBe(false);
  });
});
