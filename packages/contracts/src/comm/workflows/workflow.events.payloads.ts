import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  CommWorkflowIdSchema,
  CommWorkflowRunIdSchema,
  CorrelationIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import { WorkflowStatusValues, WorkflowTriggerTypeValues } from "./workflow.entity.js";
import { WorkflowNameSchema, WorkflowRunErrorSchema } from "./workflow.shared.js";

const WorkflowEventContextPayloadSchema = z.object({
  workflowId: CommWorkflowIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

const WorkflowRunEventContextPayloadSchema = z.object({
  workflowRunId: CommWorkflowRunIdSchema,
  workflowId: CommWorkflowIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

// ─── Workflow Created ─────────────────────────────────────────────────────────

export const CommWorkflowCreatedPayloadSchema = z.object({
  ...WorkflowEventContextPayloadSchema.shape,
  name: WorkflowNameSchema,
  createdByPrincipalId: PrincipalIdSchema,
});

export type CommWorkflowCreatedPayload = z.infer<typeof CommWorkflowCreatedPayloadSchema>;

/** @alias */
export const WorkflowCreatedEventSchema = CommWorkflowCreatedPayloadSchema;
export type WorkflowCreatedEvent = CommWorkflowCreatedPayload;

// ─── Workflow Updated ─────────────────────────────────────────────────────────

export const CommWorkflowUpdatedPayloadSchema = z.object({
  ...WorkflowEventContextPayloadSchema.shape,
  updatedByPrincipalId: PrincipalIdSchema,
});

export type CommWorkflowUpdatedPayload = z.infer<typeof CommWorkflowUpdatedPayloadSchema>;

/** @alias */
export const WorkflowUpdatedEventSchema = CommWorkflowUpdatedPayloadSchema;
export type WorkflowUpdatedEvent = CommWorkflowUpdatedPayload;

// ─── Workflow Status Changed ──────────────────────────────────────────────────

export const CommWorkflowStatusChangedPayloadSchema = z.object({
  ...WorkflowEventContextPayloadSchema.shape,
  fromStatus: z.enum(WorkflowStatusValues),
  toStatus: z.enum(WorkflowStatusValues),
  changedByPrincipalId: PrincipalIdSchema,
});

export type CommWorkflowStatusChangedPayload = z.infer<
  typeof CommWorkflowStatusChangedPayloadSchema
>;

/** @alias */
export const WorkflowStatusChangedEventSchema = CommWorkflowStatusChangedPayloadSchema;
export type WorkflowStatusChangedEvent = CommWorkflowStatusChangedPayload;

// ─── Workflow Deleted ─────────────────────────────────────────────────────────

export const CommWorkflowDeletedPayloadSchema = z.object({
  ...WorkflowEventContextPayloadSchema.shape,
  deletedByPrincipalId: PrincipalIdSchema,
});

export type CommWorkflowDeletedPayload = z.infer<typeof CommWorkflowDeletedPayloadSchema>;

/** @alias */
export const WorkflowDeletedEventSchema = CommWorkflowDeletedPayloadSchema;
export type WorkflowDeletedEvent = CommWorkflowDeletedPayload;

// ─── Workflow Triggered ───────────────────────────────────────────────────────

export const CommWorkflowTriggeredPayloadSchema = z.object({
  ...WorkflowRunEventContextPayloadSchema.shape,
  triggerType: z.enum(WorkflowTriggerTypeValues),
  triggerPayload: z.record(z.string(), z.unknown()),
});

export type CommWorkflowTriggeredPayload = z.infer<typeof CommWorkflowTriggeredPayloadSchema>;

/** @alias */
export const WorkflowTriggeredEventSchema = CommWorkflowTriggeredPayloadSchema;
export type WorkflowTriggeredEvent = CommWorkflowTriggeredPayload;

// ─── Workflow Run Completed ───────────────────────────────────────────────────

export const CommWorkflowRunCompletedPayloadSchema = z.object({
  ...WorkflowRunEventContextPayloadSchema.shape,
  completedAt: UtcDateTimeSchema,
});

export type CommWorkflowRunCompletedPayload = z.infer<typeof CommWorkflowRunCompletedPayloadSchema>;

/** @alias */
export const WorkflowRunCompletedEventSchema = CommWorkflowRunCompletedPayloadSchema;
export type WorkflowRunCompletedEvent = CommWorkflowRunCompletedPayload;

// ─── Workflow Run Failed ──────────────────────────────────────────────────────

export const CommWorkflowRunFailedPayloadSchema = z.object({
  ...WorkflowRunEventContextPayloadSchema.shape,
  error: WorkflowRunErrorSchema,
});

export type CommWorkflowRunFailedPayload = z.infer<typeof CommWorkflowRunFailedPayloadSchema>;

/** @alias */
export const WorkflowRunFailedEventSchema = CommWorkflowRunFailedPayloadSchema;
export type WorkflowRunFailedEvent = CommWorkflowRunFailedPayload;

export const WorkflowEventPayloadSchemas = {
  Created: CommWorkflowCreatedPayloadSchema,
  Updated: CommWorkflowUpdatedPayloadSchema,
  StatusChanged: CommWorkflowStatusChangedPayloadSchema,
  Deleted: CommWorkflowDeletedPayloadSchema,
  Triggered: CommWorkflowTriggeredPayloadSchema,
  RunCompleted: CommWorkflowRunCompletedPayloadSchema,
  RunFailed: CommWorkflowRunFailedPayloadSchema,
} as const;
