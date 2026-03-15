import { describe, expect, it } from "vitest";
import { TaskChecklistItemSchema } from "../task-checklist-item.entity.js";

describe("task-checklist-item.entity", () => {
  it("parses valid checked checklist item", () => {
    const result = TaskChecklistItemSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      taskId: "22222222-2222-4222-8222-222222222222",
      text: "Notify finance",
      isChecked: true,
      checkedAt: "2026-06-01T10:00:00.000Z",
      checkedByPrincipalId: "33333333-3333-4333-8333-333333333333",
      sortOrder: 0,
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects checked item missing checked metadata", () => {
    const result = TaskChecklistItemSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      taskId: "22222222-2222-4222-8222-222222222222",
      text: "Notify finance",
      isChecked: true,
      checkedAt: null,
      checkedByPrincipalId: null,
      sortOrder: 0,
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
