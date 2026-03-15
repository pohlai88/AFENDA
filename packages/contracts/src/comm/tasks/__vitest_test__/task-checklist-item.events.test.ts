import { describe, expect, it } from "vitest";
import {
  COMM_TASK_CHECKLIST_ITEM_ADDED,
  COMM_TASK_CHECKLIST_ITEM_REMOVED,
  COMM_TASK_CHECKLIST_ITEM_TOGGLED,
  COMM_TASK_CHECKLIST_UPDATED,
  CommTaskChecklistItemEvents,
  TaskChecklistItemEventTypes,
} from "../task-checklist-item.events.js";

describe("task-checklist-item.events", () => {
  it("maps constants in registry", () => {
    expect(CommTaskChecklistItemEvents.ItemAdded).toBe(COMM_TASK_CHECKLIST_ITEM_ADDED);
    expect(CommTaskChecklistItemEvents.ItemToggled).toBe(COMM_TASK_CHECKLIST_ITEM_TOGGLED);
    expect(CommTaskChecklistItemEvents.ItemRemoved).toBe(COMM_TASK_CHECKLIST_ITEM_REMOVED);
    expect(CommTaskChecklistItemEvents.ChecklistUpdated).toBe(COMM_TASK_CHECKLIST_UPDATED);
  });

  it("keeps aggregate event list stable", () => {
    expect(TaskChecklistItemEventTypes).toEqual([
      COMM_TASK_CHECKLIST_ITEM_ADDED,
      COMM_TASK_CHECKLIST_ITEM_TOGGLED,
      COMM_TASK_CHECKLIST_ITEM_REMOVED,
      COMM_TASK_CHECKLIST_UPDATED,
    ]);
  });
});
