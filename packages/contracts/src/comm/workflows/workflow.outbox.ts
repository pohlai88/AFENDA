import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommWorkflowEventTypes, CommWorkflowEvents } from "./workflow.events.js";
import {
  CommWorkflowCreatedPayloadSchema,
  CommWorkflowDeletedPayloadSchema,
  CommWorkflowRunCompletedPayloadSchema,
  CommWorkflowRunFailedPayloadSchema,
  CommWorkflowStatusChangedPayloadSchema,
  CommWorkflowTriggeredPayloadSchema,
  CommWorkflowUpdatedPayloadSchema,
} from "./workflow.events.payloads.js";

const WorkflowOutboxEventNameSchema = z.enum(CommWorkflowEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export type OutboxRecord = z.infer<typeof OutboxRecordSchema>;

export const WorkflowOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: WorkflowOutboxEventNameSchema,
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
    case CommWorkflowEvents.Created:
      validatePayload(CommWorkflowCreatedPayloadSchema);
      break;
    case CommWorkflowEvents.Updated:
      validatePayload(CommWorkflowUpdatedPayloadSchema);
      break;
    case CommWorkflowEvents.StatusChanged:
      validatePayload(CommWorkflowStatusChangedPayloadSchema);
      break;
    case CommWorkflowEvents.Deleted:
      validatePayload(CommWorkflowDeletedPayloadSchema);
      break;
    case CommWorkflowEvents.Triggered:
      validatePayload(CommWorkflowTriggeredPayloadSchema);
      break;
    case CommWorkflowEvents.RunCompleted:
      validatePayload(CommWorkflowRunCompletedPayloadSchema);
      break;
    case CommWorkflowEvents.RunFailed:
      validatePayload(CommWorkflowRunFailedPayloadSchema);
      break;
    default:
      break;
  }
});

export type WorkflowOutboxRecord = z.infer<typeof WorkflowOutboxRecordSchema>;
