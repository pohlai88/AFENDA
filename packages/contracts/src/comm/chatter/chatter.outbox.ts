import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { ChatterEventTypes, CommChatterEvents } from "./chatter.events.js";
import {
  CommChatterMessageDeletedPayloadSchema,
  CommChatterMessagePostedPayloadSchema,
  CommChatterMessageUpdatedPayloadSchema,
} from "./chatter.events.payloads.js";

const ChatterOutboxEventNameSchema = z.enum(ChatterEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export type OutboxRecord = z.infer<typeof OutboxRecordSchema>;

export const ChatterOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: ChatterOutboxEventNameSchema,
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
    case CommChatterEvents.MessagePosted:
      validatePayload(CommChatterMessagePostedPayloadSchema);
      break;
    case CommChatterEvents.MessageUpdated:
      validatePayload(CommChatterMessageUpdatedPayloadSchema);
      break;
    case CommChatterEvents.MessageDeleted:
      validatePayload(CommChatterMessageDeletedPayloadSchema);
      break;
    default:
      break;
  }
});

export type ChatterOutboxRecord = z.infer<typeof ChatterOutboxRecordSchema>;
