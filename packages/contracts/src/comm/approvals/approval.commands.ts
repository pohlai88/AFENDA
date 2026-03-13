import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { EntityIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import {
  ApprovalRequestIdSchema,
  ApprovalStepIdSchema,
  ApprovalUrgencySchema,
} from "./approval-request.entity.js";

/** Reusable string schemas */
const TitleSchema = z.string().trim().min(1).max(500);
const ReasonSchema = z.string().trim().max(500);
const CommentSchema = z.string().trim().max(2000);

/** Approval step definition used when creating a request */
export const ApprovalStepInputSchema = z.object({
  assigneeId: PrincipalIdSchema,
  /** Optional label shown in UI step chain, e.g. "Finance Manager" */
  label: z.string().trim().min(1).max(200).optional(),
});

/** Base schema for step-level commands */
const StepCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  stepId: ApprovalStepIdSchema,
});

/** Commands */
export const CreateApprovalRequestCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  title: TitleSchema,
  sourceEntityType: z.string().trim().min(1).max(128),
  sourceEntityId: EntityIdSchema,
  urgency: ApprovalUrgencySchema.optional(),
  dueDate: DateSchema.optional(),
  steps: z.array(ApprovalStepInputSchema).min(1).max(10),
});

export const ApproveStepCommandSchema = StepCommandBase.extend({
  comment: CommentSchema.optional(),
});

export const RejectStepCommandSchema = StepCommandBase.extend({
  comment: CommentSchema.min(1),
});

export const DelegateStepCommandSchema = StepCommandBase.extend({
  delegateToPrincipalId: PrincipalIdSchema,
  reason: ReasonSchema.optional(),
});

export const EscalateApprovalCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  reason: ReasonSchema.min(1),
});

export const WithdrawApprovalCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  approvalRequestId: ApprovalRequestIdSchema,
  reason: ReasonSchema.optional(),
});

export const CreateApprovalPolicyCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  name: z.string().trim().min(1).max(200),
  sourceEntityType: z.string().trim().min(1).max(128),
  autoApproveBelowAmount: z.number().int().nonnegative().optional(),
  escalationAfterHours: z.number().int().positive().optional(),
});

export const SetDelegationCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    toPrincipalId: PrincipalIdSchema,
    validFrom: DateSchema,
    validUntil: DateSchema,
    reason: ReasonSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.validUntil <= data.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validUntil must be after validFrom.",
        path: ["validUntil"],
      });
    }
  });

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
