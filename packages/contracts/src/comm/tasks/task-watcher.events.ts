export const COMM_TASK_WATCHER_ADDED = "COMM.TASK_WATCHER_ADDED" as const;
export const COMM_TASK_WATCHER_REMOVED = "COMM.TASK_WATCHER_REMOVED" as const;

export const CommTaskWatcherEvents = {
  Added: COMM_TASK_WATCHER_ADDED,
  Removed: COMM_TASK_WATCHER_REMOVED,
} as const;

/**
 * Aggregate of task-watcher domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const TaskWatcherEventTypes = [
  CommTaskWatcherEvents.Added,
  CommTaskWatcherEvents.Removed,
] as const;

export type CommTaskWatcherEvent =
  (typeof CommTaskWatcherEvents)[keyof typeof CommTaskWatcherEvents];

export {
  TaskWatcherEventPayloadSchemas,
  WatcherAddedEventSchema,
  WatcherRemovedEventSchema,
} from "./task-watcher.events.payloads.js";

export type { WatcherAddedEvent, WatcherRemovedEvent } from "./task-watcher.events.payloads.js";
