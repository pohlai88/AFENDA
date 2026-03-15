import { z } from "zod";
import {
  CommTaskIdSchema,
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  TaskChecklistItemIdSchema,
} from "../../shared/ids.js";
import { TaskChecklistItemTextSchema } from "./task-checklist-item.shared.js";

const TaskChecklistItemEventContextPayloadSchema = z.object({
  taskId: CommTaskIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

const TaskChecklistItemRefPayloadSchema = z.object({
  checklistItemId: TaskChecklistItemIdSchema,
});

// ─── Checklist Item Event Payloads ───────────────────────────────────────────

export const ChecklistItemAddedEventSchema = z.object({
  ...TaskChecklistItemEventContextPayloadSchema.shape,
  ...TaskChecklistItemRefPayloadSchema.shape,
  text: TaskChecklistItemTextSchema,
});

export const ChecklistItemToggledEventSchema = z.object({
  ...TaskChecklistItemEventContextPayloadSchema.shape,
  ...TaskChecklistItemRefPayloadSchema.shape,
  isChecked: z.boolean(),
  toggledByPrincipalId: PrincipalIdSchema,
});

export const ChecklistItemRemovedEventSchema = z.object({
  ...TaskChecklistItemEventContextPayloadSchema.shape,
  ...TaskChecklistItemRefPayloadSchema.shape,
});

export const ChecklistUpdatedEventSchema = z.object({
  ...TaskChecklistItemEventContextPayloadSchema.shape,
  updatedByPrincipalId: PrincipalIdSchema,
});

export const TaskChecklistItemEventPayloadSchemas = {
  ItemAdded: ChecklistItemAddedEventSchema,
  ItemToggled: ChecklistItemToggledEventSchema,
  ItemRemoved: ChecklistItemRemovedEventSchema,
  ChecklistUpdated: ChecklistUpdatedEventSchema,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChecklistItemAddedEvent = z.infer<typeof ChecklistItemAddedEventSchema>;
export type ChecklistItemToggledEvent = z.infer<typeof ChecklistItemToggledEventSchema>;
export type ChecklistItemRemovedEvent = z.infer<typeof ChecklistItemRemovedEventSchema>;
export type ChecklistUpdatedEvent = z.infer<typeof ChecklistUpdatedEventSchema>;
