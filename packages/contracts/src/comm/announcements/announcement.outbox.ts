import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommAnnouncementEvents, AnnouncementEventTypes } from "./announcement.events.js";
import {
  AnnouncementAcknowledgedEventSchema,
  AnnouncementArchivedEventSchema,
  AnnouncementCreatedEventSchema,
  AnnouncementPublishedEventSchema,
  AnnouncementRescheduledEventSchema,
  AnnouncementScheduledEventSchema,
  AnnouncementUnarchivedEventSchema,
  AnnouncementUnscheduledEventSchema,
  AnnouncementUpdatedEventSchema,
} from "./announcement.events.payloads.js";

const AnnouncementOutboxEventNameSchema = z.enum(AnnouncementEventTypes);

/** Generic outbox record used by announcement consumers. */
export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export type OutboxRecord = z.infer<typeof OutboxRecordSchema>;

/** Announcement-specific outbox records with event-aware payload validation. */
export const AnnouncementOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: AnnouncementOutboxEventNameSchema,
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
    case CommAnnouncementEvents.Created:
      validatePayload(AnnouncementCreatedEventSchema);
      break;
    case CommAnnouncementEvents.Published:
      validatePayload(AnnouncementPublishedEventSchema);
      break;
    case CommAnnouncementEvents.Scheduled:
      validatePayload(AnnouncementScheduledEventSchema);
      break;
    case CommAnnouncementEvents.Archived:
      validatePayload(AnnouncementArchivedEventSchema);
      break;
    case CommAnnouncementEvents.Acknowledged:
      validatePayload(AnnouncementAcknowledgedEventSchema);
      break;
    case CommAnnouncementEvents.Updated:
      validatePayload(AnnouncementUpdatedEventSchema);
      break;
    case CommAnnouncementEvents.Rescheduled:
      validatePayload(AnnouncementRescheduledEventSchema);
      break;
    case CommAnnouncementEvents.Unscheduled:
      validatePayload(AnnouncementUnscheduledEventSchema);
      break;
    case CommAnnouncementEvents.Unarchived:
      validatePayload(AnnouncementUnarchivedEventSchema);
      break;
    default:
      break;
  }
});

export type AnnouncementOutboxRecord = z.infer<typeof AnnouncementOutboxRecordSchema>;
