import { z } from "zod";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";

/** ID brands */
export const ApprovalRequestIdSchema = UuidSchema.brand<"ApprovalRequestId">();
export const ApprovalStepIdSchema = UuidSchema.brand<"ApprovalStepId">();
export const ApprovalPolicyIdSchema = UuidSchema.brand<"ApprovalPolicyId">();
export const ApprovalDelegationIdSchema = UuidSchema.brand<"ApprovalDelegationId">();
export const ApprovalStatusHistoryIdSchema = UuidSchema.brand<"ApprovalStatusHistoryId">();

/** Literal value sets */
export const ApprovalStatusValues = [
  "pending",
  "approved",
  "rejected",
  "escalated",
  "expired",
  "withdrawn",
] as const;

export const ApprovalStepStatusValues = [
  "pending",
  "approved",
  "rejected",
  "skipped",
  "delegated",
] as const;

export const ApprovalUrgencyValues = ["critical", "high", "normal", "low"] as const;

export const ApprovalStatusSchema = z.enum(ApprovalStatusValues);
export const ApprovalStepStatusSchema = z.enum(ApprovalStepStatusValues);
export const ApprovalUrgencySchema = z.enum(ApprovalUrgencyValues);

/** Reusable string schemas */
const ApprovalNumberSchema = z.string().trim().min(1).max(64);
const TitleSchema = z.string().trim().min(1).max(500);
const LabelSchema = z.string().trim().min(1).max(200);
const ReasonSchema = z.string().trim().max(500);
const CommentSchema = z.string().trim().max(2000);

export const ApprovalRequestSchema = z.object({
  id: ApprovalRequestIdSchema,
  orgId: OrgIdSchema,
  approvalNumber: ApprovalNumberSchema,
  title: TitleSchema,
  sourceEntityType: z.string().trim().min(1).max(128),
  sourceEntityId: EntityIdSchema,
  requestedByPrincipalId: PrincipalIdSchema,
  status: ApprovalStatusSchema,
  currentStepIndex: z.number().int().nonnegative(),
  totalSteps: z.number().int().positive(),
  urgency: ApprovalUrgencySchema,
  dueDate: DateSchema.nullable().default(null),
  resolvedAt: UtcDateTimeSchema.nullable().default(null),
  resolvedByPrincipalId: PrincipalIdSchema.nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const ApprovalStepSchema = z
  .object({
    id: ApprovalStepIdSchema,
    orgId: OrgIdSchema,
    approvalRequestId: ApprovalRequestIdSchema,
    stepIndex: z.number().int().nonnegative(),
    label: LabelSchema.nullable().default(null),
    assigneeId: PrincipalIdSchema,
    delegatedToId: PrincipalIdSchema.nullable().default(null),
    status: ApprovalStepStatusSchema,
    comment: CommentSchema.nullable().default(null),
    actedAt: UtcDateTimeSchema.nullable().default(null),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.status === "delegated" && !data.delegatedToId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delegated steps must include delegatedToId.",
        path: ["delegatedToId"],
      });
    }
    if (data.status !== "pending" && !data.actedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non-pending steps must include actedAt.",
        path: ["actedAt"],
      });
    }
  });

export const ApprovalStatusHistorySchema = z.object({
  id: ApprovalStatusHistoryIdSchema,
  orgId: OrgIdSchema,
  approvalRequestId: ApprovalRequestIdSchema,
  fromStatus: ApprovalStatusSchema,
  toStatus: ApprovalStatusSchema,
  changedByPrincipalId: PrincipalIdSchema.nullable().default(null),
  reason: ReasonSchema.nullable().default(null),
  occurredAt: UtcDateTimeSchema,
});

export const ApprovalPolicySchema = z.object({
  id: ApprovalPolicyIdSchema,
  orgId: OrgIdSchema,
  name: z.string().trim().min(1).max(200),
  sourceEntityType: z.string().trim().min(1).max(128),
  autoApproveBelowAmount: z.number().int().nonnegative().nullable(),
  escalationAfterHours: z.number().int().positive().nullable(),
  isActive: z.boolean(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const ApprovalDelegationSchema = z.object({
  id: ApprovalDelegationIdSchema,
  orgId: OrgIdSchema,
  fromPrincipalId: PrincipalIdSchema,
  toPrincipalId: PrincipalIdSchema,
  validFrom: DateSchema,
  validUntil: DateSchema,
  reason: ReasonSchema.nullable().default(null),
  isActive: z.boolean(),
  createdAt: UtcDateTimeSchema,
});

export type ApprovalRequestId = z.infer<typeof ApprovalRequestIdSchema>;
export type ApprovalStepId = z.infer<typeof ApprovalStepIdSchema>;
export type ApprovalPolicyId = z.infer<typeof ApprovalPolicyIdSchema>;
export type ApprovalDelegationId = z.infer<typeof ApprovalDelegationIdSchema>;
export type ApprovalStatusHistoryId = z.infer<typeof ApprovalStatusHistoryIdSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type ApprovalStepStatus = z.infer<typeof ApprovalStepStatusSchema>;
export type ApprovalUrgency = z.infer<typeof ApprovalUrgencySchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type ApprovalStep = z.infer<typeof ApprovalStepSchema>;
export type ApprovalStatusHistory = z.infer<typeof ApprovalStatusHistorySchema>;
export type ApprovalPolicy = z.infer<typeof ApprovalPolicySchema>;
export type ApprovalDelegation = z.infer<typeof ApprovalDelegationSchema>;
