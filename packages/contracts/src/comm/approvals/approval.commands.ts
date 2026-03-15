import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import {
  ApprovalRequestIdSchema,
  ApprovalStepIdSchema,
  ApprovalUrgencySchema,
} from "./approval-request.entity.js";
import {
  ApprovalLabelSchema,
  ApprovalOptionalCommentSchema,
  ApprovalOptionalReasonSchema,
  ApprovalPolicyNameSchema,
  ApprovalReasonSchema,
  ApprovalSourceEntityTypeSchema,
  ApprovalTitleSchema,
  addValidUntilAfterValidFromIssue,
} from "./approval.shared.js";

/** Approval step definition used when creating a request */
export const ApprovalStepInputSchema = z.object({
  assigneeId: PrincipalIdSchema,
  /** Optional label shown in UI step chain, e.g. "Finance Manager" */
  label: ApprovalLabelSchema.optional(),
});

/** Base schema for step-level commands */
const StepCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  stepId: ApprovalStepIdSchema,
});

/** Base schema for request-level commands */
const RequestCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
});

/** Commands */
export const CreateApprovalRequestCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  title: ApprovalTitleSchema,
  sourceEntityType: ApprovalSourceEntityTypeSchema,
  sourceEntityId: EntityIdSchema,
  urgency: ApprovalUrgencySchema.optional(),
  dueDate: DateSchema.nullable().optional().default(null),
  steps: z.array(ApprovalStepInputSchema).min(1).max(10),
});

export const ApproveStepCommandSchema = StepCommandBase.extend({
  comment: ApprovalOptionalCommentSchema.optional().default(null),
});

export const RejectStepCommandSchema = StepCommandBase.extend({
  comment: ApprovalReasonSchema.max(2000),
});

export const DelegateStepCommandSchema = StepCommandBase.extend({
  delegateToPrincipalId: PrincipalIdSchema,
  reason: ApprovalOptionalReasonSchema.optional().default(null),
});

export const EscalateApprovalCommandSchema = RequestCommandBase.extend({
  reason: ApprovalReasonSchema,
});

export const WithdrawApprovalCommandSchema = RequestCommandBase.extend({
  reason: ApprovalOptionalReasonSchema.optional().default(null),
});

export const CreateApprovalPolicyCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  name: ApprovalPolicyNameSchema,
  sourceEntityType: ApprovalSourceEntityTypeSchema,
  autoApproveBelowAmount: z.number().int().nonnegative().nullable().optional().default(null),
  escalationAfterHours: z.number().int().positive().nullable().optional().default(null),
});

export const SetDelegationCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    toPrincipalId: PrincipalIdSchema,
    validFrom: DateSchema,
    validUntil: DateSchema,
    reason: ApprovalOptionalReasonSchema.optional().default(null),
  })
  .superRefine(addValidUntilAfterValidFromIssue);

/** Types */
export type ApprovalStepInput = z.infer<typeof ApprovalStepInputSchema>;
export type CreateApprovalRequestCommand = z.infer<typeof CreateApprovalRequestCommandSchema>;
export type ApproveStepCommand = z.infer<typeof ApproveStepCommandSchema>;
export type RejectStepCommand = z.infer<typeof RejectStepCommandSchema>;
export type DelegateStepCommand = z.infer<typeof DelegateStepCommandSchema>;
export type EscalateApprovalCommand = z.infer<typeof EscalateApprovalCommandSchema>;
export type WithdrawApprovalCommand = z.infer<typeof WithdrawApprovalCommandSchema>;
export type CreateApprovalPolicyCommand = z.infer<typeof CreateApprovalPolicyCommandSchema>;
export type SetDelegationCommand = z.infer<typeof SetDelegationCommandSchema>;
