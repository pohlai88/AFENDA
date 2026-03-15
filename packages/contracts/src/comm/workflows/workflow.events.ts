// ─── Workflow Events ──────────────────────────────────────────────────────────

export const COMM_WORKFLOW_CREATED = "COMM.WORKFLOW_CREATED" as const;
export const COMM_WORKFLOW_UPDATED = "COMM.WORKFLOW_UPDATED" as const;
export const COMM_WORKFLOW_STATUS_CHANGED = "COMM.WORKFLOW_STATUS_CHANGED" as const;
export const COMM_WORKFLOW_DELETED = "COMM.WORKFLOW_DELETED" as const;
export const COMM_WORKFLOW_TRIGGERED = "COMM.WORKFLOW_TRIGGERED" as const;
export const COMM_WORKFLOW_RUN_COMPLETED = "COMM.WORKFLOW_RUN_COMPLETED" as const;
export const COMM_WORKFLOW_RUN_FAILED = "COMM.WORKFLOW_RUN_FAILED" as const;

export const CommWorkflowEvents = {
  Created: COMM_WORKFLOW_CREATED,
  Updated: COMM_WORKFLOW_UPDATED,
  StatusChanged: COMM_WORKFLOW_STATUS_CHANGED,
  Deleted: COMM_WORKFLOW_DELETED,
  Triggered: COMM_WORKFLOW_TRIGGERED,
  RunCompleted: COMM_WORKFLOW_RUN_COMPLETED,
  RunFailed: COMM_WORKFLOW_RUN_FAILED,
} as const;

/**
 * Aggregate of workflow-domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const CommWorkflowEventTypes = [
  CommWorkflowEvents.Created,
  CommWorkflowEvents.Updated,
  CommWorkflowEvents.StatusChanged,
  CommWorkflowEvents.Deleted,
  CommWorkflowEvents.Triggered,
  CommWorkflowEvents.RunCompleted,
  CommWorkflowEvents.RunFailed,
] as const;

export const WorkflowEventTypes = CommWorkflowEventTypes;

export type CommWorkflowEvent = (typeof CommWorkflowEvents)[keyof typeof CommWorkflowEvents];

export {
  CommWorkflowCreatedPayloadSchema,
  CommWorkflowDeletedPayloadSchema,
  CommWorkflowRunCompletedPayloadSchema,
  CommWorkflowRunFailedPayloadSchema,
  CommWorkflowStatusChangedPayloadSchema,
  CommWorkflowTriggeredPayloadSchema,
  CommWorkflowUpdatedPayloadSchema,
  WorkflowCreatedEventSchema,
  WorkflowDeletedEventSchema,
  WorkflowEventPayloadSchemas,
  WorkflowRunCompletedEventSchema,
  WorkflowRunFailedEventSchema,
  WorkflowStatusChangedEventSchema,
  WorkflowTriggeredEventSchema,
  WorkflowUpdatedEventSchema,
} from "./workflow.events.payloads.js";

export type {
  CommWorkflowCreatedPayload,
  CommWorkflowDeletedPayload,
  CommWorkflowRunCompletedPayload,
  CommWorkflowRunFailedPayload,
  CommWorkflowStatusChangedPayload,
  CommWorkflowTriggeredPayload,
  CommWorkflowUpdatedPayload,
  WorkflowCreatedEvent,
  WorkflowDeletedEvent,
  WorkflowRunCompletedEvent,
  WorkflowRunFailedEvent,
  WorkflowStatusChangedEvent,
  WorkflowTriggeredEvent,
  WorkflowUpdatedEvent,
} from "./workflow.events.payloads.js";
