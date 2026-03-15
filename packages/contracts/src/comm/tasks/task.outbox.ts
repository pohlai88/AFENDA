import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  COMM_TASK_ARCHIVED,
  COMM_TASK_ASSIGNED,
  COMM_TASK_CREATED,
  COMM_TASK_DELETED,
  COMM_TASK_STATUS_CHANGED,
  COMM_TASK_UPDATED,
  COMM_TASK_COMPLETED,
  COMM_TASK_CHECKLIST_ITEM_ADDED,
  COMM_TASK_CHECKLIST_ITEM_REMOVED,
  COMM_TASK_CHECKLIST_ITEM_TOGGLED,
  COMM_TASK_CHECKLIST_UPDATED,
  COMM_TASK_TIME_ENTRY_CREATED,
  COMM_TASK_TIME_ENTRY_DELETED,
  COMM_TASK_TIME_ENTRY_UPDATED,
  COMM_TASK_WATCHER_ADDED,
  COMM_TASK_WATCHER_REMOVED,
  TaskEventTypes,
} from "./task.events.js";
import {
  TaskArchivedEventSchema,
  TaskAssignedEventSchema,
  TaskCreatedEventSchema,
  TaskDeletedEventSchema,
  TaskStatusChangedEventSchema,
  TaskUpdatedEventSchema,
  TaskCompletedEventSchema,
} from "./task.events.payloads.js";
import {
  ChecklistItemAddedEventSchema,
  ChecklistItemRemovedEventSchema,
  ChecklistItemToggledEventSchema,
  ChecklistUpdatedEventSchema,
} from "./task-checklist-item.events.payloads.js";
import {
  TimeEntryCreatedEventSchema,
  TimeEntryDeletedEventSchema,
  TimeEntryUpdatedEventSchema,
} from "./task-time-entry.events.payloads.js";
import {
  WatcherAddedEventSchema,
  WatcherRemovedEventSchema,
} from "./task-watcher.events.payloads.js";

const TaskOutboxEventNameSchema = z.enum(TaskEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export type OutboxRecord = z.infer<typeof OutboxRecordSchema>;

export const TaskOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: TaskOutboxEventNameSchema,
}).superRefine((data, ctx) => {
  const validatePayload = (schema: z.ZodType<unknown>) => {
    const result = schema.safeParse(data.payload);
    if (result.success) return;
    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ["payload", ...issue.path],
      });
    }
  };

  switch (data.eventName) {
    case COMM_TASK_CREATED:
      validatePayload(TaskCreatedEventSchema);
      break;
    case COMM_TASK_UPDATED:
      validatePayload(TaskUpdatedEventSchema);
      break;
    case COMM_TASK_ASSIGNED:
      validatePayload(TaskAssignedEventSchema);
      break;
    case COMM_TASK_STATUS_CHANGED:
      validatePayload(TaskStatusChangedEventSchema);
      break;
    case COMM_TASK_COMPLETED:
      validatePayload(TaskCompletedEventSchema);
      break;
    case COMM_TASK_ARCHIVED:
      validatePayload(TaskArchivedEventSchema);
      break;
    case COMM_TASK_DELETED:
      validatePayload(TaskDeletedEventSchema);
      break;
    case COMM_TASK_CHECKLIST_ITEM_ADDED:
      validatePayload(ChecklistItemAddedEventSchema);
      break;
    case COMM_TASK_CHECKLIST_ITEM_TOGGLED:
      validatePayload(ChecklistItemToggledEventSchema);
      break;
    case COMM_TASK_CHECKLIST_ITEM_REMOVED:
      validatePayload(ChecklistItemRemovedEventSchema);
      break;
    case COMM_TASK_CHECKLIST_UPDATED:
      validatePayload(ChecklistUpdatedEventSchema);
      break;
    case COMM_TASK_TIME_ENTRY_CREATED:
      validatePayload(TimeEntryCreatedEventSchema);
      break;
    case COMM_TASK_TIME_ENTRY_UPDATED:
      validatePayload(TimeEntryUpdatedEventSchema);
      break;
    case COMM_TASK_TIME_ENTRY_DELETED:
      validatePayload(TimeEntryDeletedEventSchema);
      break;
    case COMM_TASK_WATCHER_ADDED:
      validatePayload(WatcherAddedEventSchema);
      break;
    case COMM_TASK_WATCHER_REMOVED:
      validatePayload(WatcherRemovedEventSchema);
      break;
    default:
      break;
  }
});

export type TaskOutboxRecord = z.infer<typeof TaskOutboxRecordSchema>;
