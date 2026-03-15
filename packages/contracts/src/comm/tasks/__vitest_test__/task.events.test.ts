import { describe, expect, it } from "vitest";
import {
  CommTaskChecklistItemEvents,
  TaskChecklistItemEventTypes,
  CommTaskEventTypes,
  CommTaskEvents,
  TaskTimeEntryEventTypes,
  CommTaskTimeEntryEvents,
  TaskWatcherEventTypes,
  CommTaskWatcherEvents,
  COMM_TASK_CREATED,
  COMM_TASK_UPDATED,
  COMM_TASK_ASSIGNED,
  COMM_TASK_STATUS_CHANGED,
  COMM_TASK_COMPLETED,
  COMM_TASK_ARCHIVED,
  COMM_TASK_DELETED,
  TaskEventTypes,
} from "../task.events.js";

describe("task.events", () => {
  it("CommTaskEvents registry has 16 keys", () => {
    expect(Object.keys(CommTaskEvents)).toHaveLength(16);
  });

  it("CommTaskEvents maps task core events correctly", () => {
    expect(CommTaskEvents.Created).toBe(COMM_TASK_CREATED);
    expect(CommTaskEvents.Updated).toBe(COMM_TASK_UPDATED);
    expect(CommTaskEvents.Assigned).toBe(COMM_TASK_ASSIGNED);
    expect(CommTaskEvents.StatusChanged).toBe(COMM_TASK_STATUS_CHANGED);
    expect(CommTaskEvents.Completed).toBe(COMM_TASK_COMPLETED);
    expect(CommTaskEvents.Archived).toBe(COMM_TASK_ARCHIVED);
    expect(CommTaskEvents.Deleted).toBe(COMM_TASK_DELETED);
  });

  it("CommTaskEvents maps checklist events", () => {
    expect(CommTaskEvents.ChecklistItemAdded).toBe("COMM.TASK_CHECKLIST_ITEM_ADDED");
    expect(CommTaskEvents.ChecklistItemToggled).toBe("COMM.TASK_CHECKLIST_ITEM_TOGGLED");
    expect(CommTaskEvents.ChecklistItemRemoved).toBe("COMM.TASK_CHECKLIST_ITEM_REMOVED");
    expect(CommTaskEvents.ChecklistUpdated).toBe("COMM.TASK_CHECKLIST_UPDATED");
  });

  it("CommTaskEvents maps time-entry events", () => {
    expect(CommTaskEvents.TimeEntryCreated).toBe("COMM.TASK_TIME_ENTRY_CREATED");
    expect(CommTaskEvents.TimeEntryUpdated).toBe("COMM.TASK_TIME_ENTRY_UPDATED");
    expect(CommTaskEvents.TimeEntryDeleted).toBe("COMM.TASK_TIME_ENTRY_DELETED");
  });

  it("CommTaskEvents maps watcher events", () => {
    expect(CommTaskEvents.WatcherAdded).toBe("COMM.TASK_WATCHER_ADDED");
    expect(CommTaskEvents.WatcherRemoved).toBe("COMM.TASK_WATCHER_REMOVED");
  });

  it("TaskEventTypes array has 16 entries", () => {
    expect(TaskEventTypes).toHaveLength(16);
  });

  it("CommTaskEventTypes stays aligned with TaskEventTypes", () => {
    expect(CommTaskEventTypes).toEqual(TaskEventTypes);
  });

  it("CommTaskChecklistItemEvents has correct keys", () => {
    expect(Object.keys(CommTaskChecklistItemEvents)).toHaveLength(4);
    expect(CommTaskChecklistItemEvents.ItemAdded).toBe("COMM.TASK_CHECKLIST_ITEM_ADDED");
    expect(CommTaskChecklistItemEvents.ChecklistUpdated).toBe("COMM.TASK_CHECKLIST_UPDATED");
  });

  it("TaskChecklistItemEventTypes has 4 entries", () => {
    expect(TaskChecklistItemEventTypes).toHaveLength(4);
  });

  it("CommTaskTimeEntryEvents has correct keys", () => {
    expect(Object.keys(CommTaskTimeEntryEvents)).toHaveLength(3);
    expect(CommTaskTimeEntryEvents.Created).toBe("COMM.TASK_TIME_ENTRY_CREATED");
  });

  it("TaskTimeEntryEventTypes has 3 entries", () => {
    expect(TaskTimeEntryEventTypes).toHaveLength(3);
  });

  it("CommTaskWatcherEvents has correct keys", () => {
    expect(Object.keys(CommTaskWatcherEvents)).toHaveLength(2);
    expect(CommTaskWatcherEvents.Added).toBe("COMM.TASK_WATCHER_ADDED");
    expect(CommTaskWatcherEvents.Removed).toBe("COMM.TASK_WATCHER_REMOVED");
  });

  it("TaskWatcherEventTypes has 2 entries", () => {
    expect(TaskWatcherEventTypes).toHaveLength(2);
  });
});
