export const COMM_TASK_CHECKLIST_ITEM_ADDED = "COMM.TASK_CHECKLIST_ITEM_ADDED" as const;
export const COMM_TASK_CHECKLIST_ITEM_TOGGLED = "COMM.TASK_CHECKLIST_ITEM_TOGGLED" as const;
export const COMM_TASK_CHECKLIST_ITEM_REMOVED = "COMM.TASK_CHECKLIST_ITEM_REMOVED" as const;
export const COMM_TASK_CHECKLIST_UPDATED = "COMM.TASK_CHECKLIST_UPDATED" as const;

export const CommTaskChecklistItemEvents = {
  ItemAdded: COMM_TASK_CHECKLIST_ITEM_ADDED,
  ItemToggled: COMM_TASK_CHECKLIST_ITEM_TOGGLED,
  ItemRemoved: COMM_TASK_CHECKLIST_ITEM_REMOVED,
  ChecklistUpdated: COMM_TASK_CHECKLIST_UPDATED,
} as const;

/**
 * Aggregate of task-checklist-item domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const TaskChecklistItemEventTypes = [
  CommTaskChecklistItemEvents.ItemAdded,
  CommTaskChecklistItemEvents.ItemToggled,
  CommTaskChecklistItemEvents.ItemRemoved,
  CommTaskChecklistItemEvents.ChecklistUpdated,
] as const;

export type CommTaskChecklistItemEvent =
  (typeof CommTaskChecklistItemEvents)[keyof typeof CommTaskChecklistItemEvents];

export {
  ChecklistItemAddedEventSchema,
  ChecklistItemRemovedEventSchema,
  ChecklistItemToggledEventSchema,
  ChecklistUpdatedEventSchema,
  TaskChecklistItemEventPayloadSchemas,
} from "./task-checklist-item.events.payloads.js";

export type {
  ChecklistItemAddedEvent,
  ChecklistItemRemovedEvent,
  ChecklistItemToggledEvent,
  ChecklistUpdatedEvent,
} from "./task-checklist-item.events.payloads.js";
