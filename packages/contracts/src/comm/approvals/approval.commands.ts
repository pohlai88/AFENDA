import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import {
  ApprovalRequestIdSchema,
  ApprovalStepIdSchema,
  ApprovalUrgencySchema,
} from "./approval-request.entity.js";

// ─── Approval step definition used when creating a request ───────────────────
export const ApprovalStepInputSchema = z.object({
  assigneeId: PrincipalIdSchema,
  /** Optional label shown in UI step chain, e.g. "Finance Manager" */
  label: z.string().trim().min(1).max(200).optional(),
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const CreateApprovalRequestCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  title: z.string().trim().min(1).max(500),
  sourceEntityType: z.string().trim().min(1).max(128),
  sourceEntityId: EntityIdSchema,
  urgency: ApprovalUrgencySchema.optional(),
  dueDate: DateSchema.optional(),
  steps: z.array(ApprovalStepInputSchema).min(1).max(10),
});

export const ApproveStepCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  stepId: ApprovalStepIdSchema,
  comment: z.string().trim().max(2000).optional(),
});

export const RejectStepCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  stepId: ApprovalStepIdSchema,
  comment: z.string().trim().min(1).max(2000),
});

export const DelegateStepCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  stepId: ApprovalStepIdSchema,
  delegateToPrincipalId: PrincipalIdSchema,
  reason: z.string().trim().max(500).optional(),
});

export const EscalateApprovalCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  reason: z.string().trim().min(1).max(500),
});

export const WithdrawApprovalCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const CreateApprovalPolicyCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  name: z.string().trim().min(1).max(200),
  sourceEntityType: z.string().trim().min(1).max(128),
  autoApproveBelowAmount: z.number().int().nonnegative().optional(),
  escalationAfterHours: z.number().int().positive().optional(),
});

export const SetDelegationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  toPrincipalId: PrincipalIdSchema,
  validFrom: DateSchema,
  validUntil: DateSchema,
  reason: z.string().trim().max(500).optional(),
});

export type ApprovalStepInput = z.infer<typeof ApprovalStepInputSchema>;
export type CreateApprovalRequestCommand = z.infer<typeof CreateApprovalRequestCommandSchema>;
export type ApproveStepCommand = z.infer<typeof ApproveStepCommandSchema>;
export type RejectStepCommand = z.infer<typeof RejectStepCommandSchema>;
export type DelegateStepCommand = z.infer<typeof DelegateStepCommandSchema>;
export type EscalateApprovalCommand = z.infer<typeof EscalateApprovalCommandSchema>;
export type WithdrawApprovalCommand = z.infer<typeof WithdrawApprovalCommandSchema>;
export type CreateApprovalPolicyCommand = z.infer<typeof CreateApprovalPolicyCommandSchema>;
export type SetDelegationCommand = z.infer<typeof SetDelegationCommandSchema>;
