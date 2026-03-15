import { describe, expect, it } from "vitest";
import {
  COMM_TASK_TIME_ENTRY_CREATED,
  COMM_TASK_TIME_ENTRY_DELETED,
  COMM_TASK_TIME_ENTRY_UPDATED,
  CommTaskTimeEntryEvents,
  TaskTimeEntryEventTypes,
} from "../task-time-entry.events.js";

describe("task-time-entry.events", () => {
  it("maps constants in registry", () => {
    expect(CommTaskTimeEntryEvents.Created).toBe(COMM_TASK_TIME_ENTRY_CREATED);
    expect(CommTaskTimeEntryEvents.Updated).toBe(COMM_TASK_TIME_ENTRY_UPDATED);
    expect(CommTaskTimeEntryEvents.Deleted).toBe(COMM_TASK_TIME_ENTRY_DELETED);
  });

  it("keeps aggregate event list stable", () => {
    expect(TaskTimeEntryEventTypes).toEqual([
      COMM_TASK_TIME_ENTRY_CREATED,
      COMM_TASK_TIME_ENTRY_UPDATED,
      COMM_TASK_TIME_ENTRY_DELETED,
    ]);
  });
});
