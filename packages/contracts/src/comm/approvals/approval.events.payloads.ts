import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  CorrelationIdSchema,
  EntityIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import {
  ApprovalDelegationIdSchema,
  ApprovalPolicyIdSchema,
  ApprovalRequestIdSchema,
  ApprovalStatusSchema,
  ApprovalStepIdSchema,
  ApprovalUrgencySchema,
} from "./approval-request.entity.js";
import {
  ApprovalNumberSchema,
  ApprovalOptionalCommentSchema,
  ApprovalOptionalReasonSchema,
  ApprovalPolicyNameSchema,
  ApprovalReasonSchema,
  ApprovalSourceEntityTypeSchema,
  ApprovalTitleSchema,
  addValidUntilAfterValidFromIssue,
} from "./approval.shared.js";

const ApprovalEventContextPayloadSchema = z.object({
  approvalRequestId: ApprovalRequestIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

const ApprovalStepEventContextPayloadSchema = ApprovalEventContextPayloadSchema.extend({
  stepId: ApprovalStepIdSchema,
});

export const CommApprovalRequestCreatedPayloadSchema = z.object({
  ...ApprovalEventContextPayloadSchema.shape,
  approvalNumber: ApprovalNumberSchema,
  title: ApprovalTitleSchema,
  sourceEntityType: ApprovalSourceEntityTypeSchema,
  sourceEntityId: EntityIdSchema,
  requestedByPrincipalId: PrincipalIdSchema,
  urgency: ApprovalUrgencySchema,
  totalSteps: z.number().int().positive(),
});

export const CommApprovalStepApprovedPayloadSchema = z.object({
  ...ApprovalStepEventContextPayloadSchema.shape,
  actedByPrincipalId: PrincipalIdSchema,
  comment: ApprovalOptionalCommentSchema,
});

export const CommApprovalStepRejectedPayloadSchema = z.object({
  ...ApprovalStepEventContextPayloadSchema.shape,
  actedByPrincipalId: PrincipalIdSchema,
  comment: ApprovalOptionalCommentSchema,
});

export const CommApprovalStepDelegatedPayloadSchema = z.object({
  ...ApprovalStepEventContextPayloadSchema.shape,
  delegatedByPrincipalId: PrincipalIdSchema,
  delegatedToPrincipalId: PrincipalIdSchema,
  reason: ApprovalOptionalReasonSchema,
});

export const CommApprovalEscalatedPayloadSchema = z.object({
  ...ApprovalEventContextPayloadSchema.shape,
  reason: ApprovalReasonSchema,
});

export const CommApprovalWithdrawnPayloadSchema = z.object({
  ...ApprovalEventContextPayloadSchema.shape,
  reason: ApprovalOptionalReasonSchema,
});

export const CommApprovalPolicyCreatedPayloadSchema = z.object({
  approvalPolicyId: ApprovalPolicyIdSchema,
  orgId: OrgIdSchema,
  name: ApprovalPolicyNameSchema,
  sourceEntityType: ApprovalSourceEntityTypeSchema,
  correlationId: CorrelationIdSchema,
});

export const CommApprovalDelegationSetPayloadSchema = z
  .object({
    approvalDelegationId: ApprovalDelegationIdSchema,
    orgId: OrgIdSchema,
    fromPrincipalId: PrincipalIdSchema,
    toPrincipalId: PrincipalIdSchema,
    validFrom: DateSchema,
    validUntil: DateSchema,
    reason: ApprovalOptionalReasonSchema,
    correlationId: CorrelationIdSchema,
  })
  .superRefine(addValidUntilAfterValidFromIssue);

export const CommApprovalStatusChangedPayloadSchema = z
  .object({
    ...ApprovalEventContextPayloadSchema.shape,
    fromStatus: ApprovalStatusSchema,
    toStatus: ApprovalStatusSchema,
    changedByPrincipalId: PrincipalIdSchema.nullable().default(null),
    reason: ApprovalOptionalReasonSchema,
    occurredAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.fromStatus === data.toStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fromStatus and toStatus must differ.",
        path: ["toStatus"],
      });
    }
  });

export const CommApprovalExpiredPayloadSchema = z.object({
  ...ApprovalEventContextPayloadSchema.shape,
  dueDate: DateSchema,
  expiredAt: UtcDateTimeSchema,
});

export const ApprovalRequestCreatedEventSchema = CommApprovalRequestCreatedPayloadSchema;
export const ApprovalStepApprovedEventSchema = CommApprovalStepApprovedPayloadSchema;
export const ApprovalStepRejectedEventSchema = CommApprovalStepRejectedPayloadSchema;
export const ApprovalStepDelegatedEventSchema = CommApprovalStepDelegatedPayloadSchema;
export const ApprovalEscalatedEventSchema = CommApprovalEscalatedPayloadSchema;
export const ApprovalWithdrawnEventSchema = CommApprovalWithdrawnPayloadSchema;
export const ApprovalPolicyCreatedEventSchema = CommApprovalPolicyCreatedPayloadSchema;
export const ApprovalDelegationSetEventSchema = CommApprovalDelegationSetPayloadSchema;
export const ApprovalStatusChangedEventSchema = CommApprovalStatusChangedPayloadSchema;
export const ApprovalExpiredEventSchema = CommApprovalExpiredPayloadSchema;

export const ApprovalEventPayloadSchemas = {
  RequestCreated: CommApprovalRequestCreatedPayloadSchema,
  StepApproved: CommApprovalStepApprovedPayloadSchema,
  StepRejected: CommApprovalStepRejectedPayloadSchema,
  StepDelegated: CommApprovalStepDelegatedPayloadSchema,
  Escalated: CommApprovalEscalatedPayloadSchema,
  Withdrawn: CommApprovalWithdrawnPayloadSchema,
  PolicyCreated: CommApprovalPolicyCreatedPayloadSchema,
  DelegationSet: CommApprovalDelegationSetPayloadSchema,
  StatusChanged: CommApprovalStatusChangedPayloadSchema,
  Expired: CommApprovalExpiredPayloadSchema,
} as const;

export type CommApprovalRequestCreatedPayload = z.infer<
  typeof CommApprovalRequestCreatedPayloadSchema
>;
export type CommApprovalStepApprovedPayload = z.infer<typeof CommApprovalStepApprovedPayloadSchema>;
export type CommApprovalStepRejectedPayload = z.infer<typeof CommApprovalStepRejectedPayloadSchema>;
export type CommApprovalStepDelegatedPayload = z.infer<
  typeof CommApprovalStepDelegatedPayloadSchema
>;
export type CommApprovalEscalatedPayload = z.infer<typeof CommApprovalEscalatedPayloadSchema>;
export type CommApprovalWithdrawnPayload = z.infer<typeof CommApprovalWithdrawnPayloadSchema>;
export type CommApprovalPolicyCreatedPayload = z.infer<
  typeof CommApprovalPolicyCreatedPayloadSchema
>;
export type CommApprovalDelegationSetPayload = z.infer<
  typeof CommApprovalDelegationSetPayloadSchema
>;
export type CommApprovalStatusChangedPayload = z.infer<
  typeof CommApprovalStatusChangedPayloadSchema
>;
export type CommApprovalExpiredPayload = z.infer<typeof CommApprovalExpiredPayloadSchema>;

export type ApprovalRequestCreatedEvent = z.infer<typeof ApprovalRequestCreatedEventSchema>;
export type ApprovalStepApprovedEvent = z.infer<typeof ApprovalStepApprovedEventSchema>;
export type ApprovalStepRejectedEvent = z.infer<typeof ApprovalStepRejectedEventSchema>;
export type ApprovalStepDelegatedEvent = z.infer<typeof ApprovalStepDelegatedEventSchema>;
export type ApprovalEscalatedEvent = z.infer<typeof ApprovalEscalatedEventSchema>;
export type ApprovalWithdrawnEvent = z.infer<typeof ApprovalWithdrawnEventSchema>;
export type ApprovalPolicyCreatedEvent = z.infer<typeof ApprovalPolicyCreatedEventSchema>;
export type ApprovalDelegationSetEvent = z.infer<typeof ApprovalDelegationSetEventSchema>;
export type ApprovalStatusChangedEvent = z.infer<typeof ApprovalStatusChangedEventSchema>;
export type ApprovalExpiredEvent = z.infer<typeof ApprovalExpiredEventSchema>;
