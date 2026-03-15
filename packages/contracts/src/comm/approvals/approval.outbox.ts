import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommApprovalEventTypes, CommApprovalEvents } from "./approval.events.js";
import {
  CommApprovalDelegationSetPayloadSchema,
  CommApprovalEscalatedPayloadSchema,
  CommApprovalExpiredPayloadSchema,
  CommApprovalPolicyCreatedPayloadSchema,
  CommApprovalRequestCreatedPayloadSchema,
  CommApprovalStatusChangedPayloadSchema,
  CommApprovalStepApprovedPayloadSchema,
  CommApprovalStepDelegatedPayloadSchema,
  CommApprovalStepRejectedPayloadSchema,
  CommApprovalWithdrawnPayloadSchema,
} from "./approval.events.payloads.js";

const ApprovalOutboxEventNameSchema = z.enum(CommApprovalEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export type OutboxRecord = z.infer<typeof OutboxRecordSchema>;

export const ApprovalOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: ApprovalOutboxEventNameSchema,
}).superRefine((data, ctx) => {
  const validatePayload = (schema: z.ZodType<unknown>) => {
    const result = schema.safeParse(data.payload);
    if (result.success) return;
    for (const issue of result.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ["payload", ...issue.path],
      });
    }
  };

  switch (data.eventName) {
    case CommApprovalEvents.RequestCreated:
      validatePayload(CommApprovalRequestCreatedPayloadSchema);
      break;
    case CommApprovalEvents.StepApproved:
      validatePayload(CommApprovalStepApprovedPayloadSchema);
      break;
    case CommApprovalEvents.StepRejected:
      validatePayload(CommApprovalStepRejectedPayloadSchema);
      break;
    case CommApprovalEvents.StepDelegated:
      validatePayload(CommApprovalStepDelegatedPayloadSchema);
      break;
    case CommApprovalEvents.Escalated:
      validatePayload(CommApprovalEscalatedPayloadSchema);
      break;
    case CommApprovalEvents.Withdrawn:
      validatePayload(CommApprovalWithdrawnPayloadSchema);
      break;
    case CommApprovalEvents.PolicyCreated:
      validatePayload(CommApprovalPolicyCreatedPayloadSchema);
      break;
    case CommApprovalEvents.DelegationSet:
      validatePayload(CommApprovalDelegationSetPayloadSchema);
      break;
    case CommApprovalEvents.StatusChanged:
      validatePayload(CommApprovalStatusChangedPayloadSchema);
      break;
    case CommApprovalEvents.Expired:
      validatePayload(CommApprovalExpiredPayloadSchema);
      break;
    default:
      break;
  }
});

export type ApprovalOutboxRecord = z.infer<typeof ApprovalOutboxRecordSchema>;
