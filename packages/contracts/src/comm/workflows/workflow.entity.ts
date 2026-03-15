import { z } from "zod";
import {
  CommWorkflowIdSchema,
  CommWorkflowRunIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  WorkflowDescriptionSchema,
  WorkflowNameSchema,
  WorkflowRunErrorSchema,
} from "./workflow.shared.js";

// ─── Workflow IDs ─────────────────────────────────────────────────────────────

// ─── Workflow Trigger Types ───────────────────────────────────────────────────

export const WorkflowTriggerTypeValues = [
  "task.created",
  "task.status_changed",
  "task.assigned",
  "project.created",
  "approval.submitted",
  "approval.approved",
  "approval.rejected",
  "meeting.created",
  "resolution.proposed",
  "resolution.passed",
  "document.published",
  "announcement.published",
  "action_item.overdue",
] as const;

export type WorkflowTriggerType = (typeof WorkflowTriggerTypeValues)[number];

// ─── Workflow Action Types ────────────────────────────────────────────────────

export const WorkflowActionTypeValues = [
  "create_task",
  "create_action_item",
  "send_notification",
  "send_email",
  "call_webhook",
  "update_field",
] as const;

export type WorkflowActionType = (typeof WorkflowActionTypeValues)[number];

// ─── Workflow Status ──────────────────────────────────────────────────────────

export const WorkflowStatusValues = ["draft", "active", "paused", "archived"] as const;

export type WorkflowStatus = (typeof WorkflowStatusValues)[number];

// ─── Workflow Condition Operators ─────────────────────────────────────────────

export const ConditionOperatorValues = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "is_empty",
  "is_not_empty",
] as const;

export type ConditionOperator = (typeof ConditionOperatorValues)[number];

// ─── Workflow Trigger Schema ──────────────────────────────────────────────────

export const WorkflowTriggerSchema = z.object({
  type: z.enum(WorkflowTriggerTypeValues),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(ConditionOperatorValues),
        value: z.unknown().optional(),
      }),
    )
    .optional(),
});

export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;

// ─── Workflow Action Schema ───────────────────────────────────────────────────

export const WorkflowActionSchema = z.object({
  type: z.enum(WorkflowActionTypeValues),
  config: z.record(z.string(), z.unknown()),
});

export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;

// ─── Workflow Entity Schema ───────────────────────────────────────────────────

export const WorkflowSchema = z.object({
  id: CommWorkflowIdSchema,
  orgId: OrgIdSchema,
  name: WorkflowNameSchema,
  description: WorkflowDescriptionSchema.nullable(),
  status: z.enum(WorkflowStatusValues),
  trigger: WorkflowTriggerSchema,
  actions: z.array(WorkflowActionSchema).min(1).max(10),
  createdByPrincipalId: PrincipalIdSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
  lastTriggeredAt: UtcDateTimeSchema.nullable(),
  runCount: z.number().int().nonnegative(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// ─── Workflow Run Schema ──────────────────────────────────────────────────────

export const WorkflowRunStatusValues = ["pending", "running", "completed", "failed"] as const;

export type WorkflowRunStatus = (typeof WorkflowRunStatusValues)[number];

export const WorkflowRunSchema = z.object({
  id: CommWorkflowRunIdSchema,
  orgId: OrgIdSchema,
  workflowId: CommWorkflowIdSchema,
  status: z.enum(WorkflowRunStatusValues),
  triggerEventId: z.string().uuid().nullable(),
  triggerPayload: z.record(z.string(), z.unknown()),
  startedAt: UtcDateTimeSchema,
  completedAt: UtcDateTimeSchema.nullable(),
  error: WorkflowRunErrorSchema.nullable(),
  executedActions: z.array(
    z.object({
      actionType: z.enum(WorkflowActionTypeValues),
      status: z.enum(["pending", "completed", "failed"]),
      result: z.unknown().optional(),
      error: WorkflowRunErrorSchema.optional(),
    }),
  ),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
