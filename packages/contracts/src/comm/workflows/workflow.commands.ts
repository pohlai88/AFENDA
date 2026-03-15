import { z } from "zod";
import { CommWorkflowIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import {
  WorkflowTriggerSchema,
  WorkflowActionSchema,
  WorkflowStatusValues,
} from "./workflow.entity.js";
import { WorkflowDescriptionSchema, WorkflowNameSchema } from "./workflow.shared.js";

// ─── Base Command Schema ──────────────────────────────────────────────────────

const WorkflowCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
});

function addNoFieldsForUpdateIssue(fields: Record<string, unknown>, ctx: z.RefinementCtx) {
  if (Object.values(fields).every((v) => v === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update.",
      path: [],
    });
  }
}

function addDuplicateWorkflowIdsIssue(workflowIds: readonly string[], ctx: z.RefinementCtx) {
  if (new Set(workflowIds).size !== workflowIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate workflowId values are not allowed.",
      path: ["workflowIds"],
    });
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export const CreateWorkflowCommandSchema = WorkflowCommandBase.extend({
  name: WorkflowNameSchema,
  description: WorkflowDescriptionSchema.optional(),
  trigger: WorkflowTriggerSchema,
  actions: z.array(WorkflowActionSchema).min(1).max(10),
});

export const UpdateWorkflowCommandSchema = WorkflowCommandBase.extend({
  workflowId: CommWorkflowIdSchema,
  name: WorkflowNameSchema.optional(),
  description: WorkflowDescriptionSchema.optional(),
  trigger: WorkflowTriggerSchema.optional(),
  actions: z.array(WorkflowActionSchema).min(1).max(10).optional(),
}).superRefine((data, ctx) => {
  const { idempotencyKey: _k, orgId: _o, principalId: _p, workflowId: _id, ...fields } = data;
  addNoFieldsForUpdateIssue(fields, ctx);
});

export const ChangeWorkflowStatusCommandSchema = WorkflowCommandBase.extend({
  workflowId: CommWorkflowIdSchema,
  status: z.enum(WorkflowStatusValues),
});

export const DeleteWorkflowCommandSchema = WorkflowCommandBase.extend({
  workflowId: CommWorkflowIdSchema,
});

export const ExecuteWorkflowCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  orgId: OrgIdSchema,
  workflowId: CommWorkflowIdSchema,
  triggerEventId: z.string().uuid().optional(),
  triggerPayload: z.record(z.string(), z.unknown()),
});

export const CloneWorkflowCommandSchema = WorkflowCommandBase.extend({
  sourceWorkflowId: CommWorkflowIdSchema,
  newName: WorkflowNameSchema,
});

// ─── Bulk Commands ────────────────────────────────────────────────────────────

export const BulkChangeWorkflowStatusCommandSchema = WorkflowCommandBase.extend({
  workflowIds: z.array(CommWorkflowIdSchema).min(1).max(50),
  status: z.enum(WorkflowStatusValues),
}).superRefine((data, ctx) => {
  addDuplicateWorkflowIdsIssue(data.workflowIds, ctx);
});

/**
 * Trigger multiple workflows at once for the same event payload.
 * Useful for fan-out scenarios (e.g., broadcast a single trigger event to N workflows).
 * Deduplication is enforced: duplicate workflowIds within a single call are rejected.
 */
export const BulkExecuteWorkflowsCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    orgId: OrgIdSchema,
    workflowIds: z.array(CommWorkflowIdSchema).min(1).max(20),
    triggerEventId: z.string().uuid().optional(),
    triggerPayload: z.record(z.string(), z.unknown()),
  })
  .superRefine((data, ctx) => {
    addDuplicateWorkflowIdsIssue(data.workflowIds, ctx);
  });

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateWorkflowCommand = z.infer<typeof CreateWorkflowCommandSchema>;
export type UpdateWorkflowCommand = z.infer<typeof UpdateWorkflowCommandSchema>;
export type ChangeWorkflowStatusCommand = z.infer<typeof ChangeWorkflowStatusCommandSchema>;
export type DeleteWorkflowCommand = z.infer<typeof DeleteWorkflowCommandSchema>;
export type ExecuteWorkflowCommand = z.infer<typeof ExecuteWorkflowCommandSchema>;
export type CloneWorkflowCommand = z.infer<typeof CloneWorkflowCommandSchema>;
export type BulkChangeWorkflowStatusCommand = z.infer<typeof BulkChangeWorkflowStatusCommandSchema>;
export type BulkExecuteWorkflowsCommand = z.infer<typeof BulkExecuteWorkflowsCommandSchema>;
