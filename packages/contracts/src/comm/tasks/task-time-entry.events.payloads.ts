import { z } from "zod";
import {
  CommTaskIdSchema,
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  TaskTimeEntryIdSchema,
} from "../../shared/ids.js";
import { DateSchema } from "../../shared/datetime.js";
import { TaskTimeEntryMinutesSchema } from "./task-time-entry.shared.js";

const TaskTimeEntryEventContextPayloadSchema = z.object({
  taskId: CommTaskIdSchema,
  orgId: OrgIdSchema,
  timeEntryId: TaskTimeEntryIdSchema,
  correlationId: CorrelationIdSchema,
});

// ─── Time Entry Event Payloads ───────────────────────────────────────────────

export const TimeEntryCreatedEventSchema = z.object({
  ...TaskTimeEntryEventContextPayloadSchema.shape,
  principalId: PrincipalIdSchema,
  minutes: TaskTimeEntryMinutesSchema,
  entryDate: DateSchema,
});

export const TimeEntryUpdatedEventSchema = z.object({
  ...TaskTimeEntryEventContextPayloadSchema.shape,
  principalId: PrincipalIdSchema,
});

export const TimeEntryDeletedEventSchema = z.object({
  ...TaskTimeEntryEventContextPayloadSchema.shape,
  deletedByPrincipalId: PrincipalIdSchema,
});

export const TaskTimeEntryEventPayloadSchemas = {
  Created: TimeEntryCreatedEventSchema,
  Updated: TimeEntryUpdatedEventSchema,
  Deleted: TimeEntryDeletedEventSchema,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type TimeEntryCreatedEvent = z.infer<typeof TimeEntryCreatedEventSchema>;
export type TimeEntryUpdatedEvent = z.infer<typeof TimeEntryUpdatedEventSchema>;
export type TimeEntryDeletedEvent = z.infer<typeof TimeEntryDeletedEventSchema>;
