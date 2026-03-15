import { describe, expect, it } from "vitest";
import {
  COMM_TASK_WATCHER_ADDED,
  COMM_TASK_WATCHER_REMOVED,
  CommTaskWatcherEvents,
  TaskWatcherEventTypes,
} from "../task-watcher.events.js";

describe("task-watcher.events", () => {
  it("maps constants in registry", () => {
    expect(CommTaskWatcherEvents.Added).toBe(COMM_TASK_WATCHER_ADDED);
    expect(CommTaskWatcherEvents.Removed).toBe(COMM_TASK_WATCHER_REMOVED);
  });

  it("keeps aggregate event list stable", () => {
    expect(TaskWatcherEventTypes).toEqual([
      COMM_TASK_WATCHER_ADDED,
      COMM_TASK_WATCHER_REMOVED,
    ]);
  });
});
