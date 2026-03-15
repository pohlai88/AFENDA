export const COMM_TASK_TIME_ENTRY_CREATED = "COMM.TASK_TIME_ENTRY_CREATED" as const;
export const COMM_TASK_TIME_ENTRY_UPDATED = "COMM.TASK_TIME_ENTRY_UPDATED" as const;
export const COMM_TASK_TIME_ENTRY_DELETED = "COMM.TASK_TIME_ENTRY_DELETED" as const;

export const CommTaskTimeEntryEvents = {
  Created: COMM_TASK_TIME_ENTRY_CREATED,
  Updated: COMM_TASK_TIME_ENTRY_UPDATED,
  Deleted: COMM_TASK_TIME_ENTRY_DELETED,
} as const;

/**
 * Aggregate of task-time-entry domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const TaskTimeEntryEventTypes = [
  CommTaskTimeEntryEvents.Created,
  CommTaskTimeEntryEvents.Updated,
  CommTaskTimeEntryEvents.Deleted,
] as const;

export type CommTaskTimeEntryEvent =
  (typeof CommTaskTimeEntryEvents)[keyof typeof CommTaskTimeEntryEvents];

export {
  TaskTimeEntryEventPayloadSchemas,
  TimeEntryCreatedEventSchema,
  TimeEntryDeletedEventSchema,
  TimeEntryUpdatedEventSchema,
} from "./task-time-entry.events.payloads.js";

export type {
  TimeEntryCreatedEvent,
  TimeEntryDeletedEvent,
  TimeEntryUpdatedEvent,
} from "./task-time-entry.events.payloads.js";
