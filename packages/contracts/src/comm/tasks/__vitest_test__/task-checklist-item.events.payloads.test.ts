import { describe, expect, it } from "vitest";
import {
  ChecklistItemAddedEventSchema,
  ChecklistItemToggledEventSchema,
  ChecklistItemRemovedEventSchema,
  ChecklistUpdatedEventSchema,
} from "../task-checklist-item.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const TASK_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const ITEM_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("task-checklist-item.events.payloads", () => {
  it("parses ChecklistItemAddedEventSchema", () => {
    const result = ChecklistItemAddedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      checklistItemId: ITEM_ID,
      text: "Write unit tests",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects ChecklistItemAddedEventSchema missing text", () => {
    const result = ChecklistItemAddedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      checklistItemId: ITEM_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });

  it("parses ChecklistItemToggledEventSchema", () => {
    const result = ChecklistItemToggledEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      checklistItemId: ITEM_ID,
      isChecked: true,
      toggledByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses ChecklistItemToggledEventSchema with isChecked false", () => {
    const result = ChecklistItemToggledEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      checklistItemId: ITEM_ID,
      isChecked: false,
      toggledByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses ChecklistItemRemovedEventSchema", () => {
    const result = ChecklistItemRemovedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      checklistItemId: ITEM_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("parses ChecklistUpdatedEventSchema", () => {
    const result = ChecklistUpdatedEventSchema.safeParse({
      taskId: TASK_ID,
      orgId: ORG_ID,
      updatedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
