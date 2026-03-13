import {
  COMM_TASK_CHECKLIST_ITEM_ADDED,
  COMM_TASK_CHECKLIST_ITEM_TOGGLED,
  COMM_TASK_CHECKLIST_ITEM_REMOVED,
  COMM_TASK_CHECKLIST_UPDATED,
} from "./task-checklist-item.events.js";
import {
  COMM_TASK_TIME_ENTRY_CREATED,
  COMM_TASK_TIME_ENTRY_UPDATED,
  COMM_TASK_TIME_ENTRY_DELETED,
} from "./task-time-entry.events.js";
import { COMM_TASK_WATCHER_ADDED, COMM_TASK_WATCHER_REMOVED } from "./task-watcher.events.js";

export * from "./task-checklist-item.events.js";
export * from "./task-time-entry.events.js";
export * from "./task-watcher.events.js";

export const COMM_TASK_CREATED = "COMM.TASK_CREATED" as const;
export const COMM_TASK_UPDATED = "COMM.TASK_UPDATED" as const;
export const COMM_TASK_ASSIGNED = "COMM.TASK_ASSIGNED" as const;
export const COMM_TASK_STATUS_CHANGED = "COMM.TASK_STATUS_CHANGED" as const;
export const COMM_TASK_COMPLETED = "COMM.TASK_COMPLETED" as const;
export const COMM_TASK_ARCHIVED = "COMM.TASK_ARCHIVED" as const;
export const COMM_TASK_DELETED = "COMM.TASK_DELETED" as const;

/** Aggregate of all task-domain event types (used for outbox validation). */
export const TaskEventTypes = [
  COMM_TASK_CREATED,
  COMM_TASK_UPDATED,
  COMM_TASK_ASSIGNED,
  COMM_TASK_STATUS_CHANGED,
  COMM_TASK_COMPLETED,
  COMM_TASK_ARCHIVED,
  COMM_TASK_DELETED,
  COMM_TASK_CHECKLIST_ITEM_ADDED,
  COMM_TASK_CHECKLIST_ITEM_TOGGLED,
  COMM_TASK_CHECKLIST_ITEM_REMOVED,
  COMM_TASK_CHECKLIST_UPDATED,
  COMM_TASK_TIME_ENTRY_CREATED,
  COMM_TASK_TIME_ENTRY_UPDATED,
  COMM_TASK_TIME_ENTRY_DELETED,
  COMM_TASK_WATCHER_ADDED,
  COMM_TASK_WATCHER_REMOVED,
] as const;
