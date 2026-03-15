import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CommAgendaItemEventTypes, CommAgendaItemEvents } from "./agenda-item.events.js";
import {
  AgendaItemAddedEventSchema,
  AgendaItemRemovedEventSchema,
  AgendaItemUpdatedEventSchema,
} from "./agenda-item.events.payloads.js";
import { CommAttendeeEventTypes, CommAttendeeEvents } from "./attendee.events.js";
import {
  AttendeeAddedEventSchema,
  AttendeeRemovedEventSchema,
  AttendeeStatusUpdatedEventSchema,
  AttendeeUpdatedEventSchema,
} from "./attendee.events.payloads.js";
import { CommMinutesEventTypes, CommMinutesEvents } from "./minutes.events.js";
import {
  ActionItemCreatedEventSchema,
  ActionItemDeletedEventSchema,
  ActionItemUpdatedEventSchema,
  MinutesRecordedEventSchema,
} from "./minutes.events.payloads.js";
import { CommMeetingEventTypes, CommMeetingEvents } from "./meeting.events.js";
import {
  MeetingAdjournedEventSchema,
  MeetingCancelledEventSchema,
  MeetingCompletedEventSchema,
  MeetingCreatedEventSchema,
  MeetingDeletedEventSchema,
  MeetingStartedEventSchema,
  MeetingUpdatedEventSchema,
} from "./meeting.events.payloads.js";
import { CommResolutionEventTypes, CommResolutionEvents } from "./resolution.events.js";
import {
  ResolutionProposedPayloadSchema,
  ResolutionUpdatedPayloadSchema,
  ResolutionVoteCastPayloadSchema,
  ResolutionWithdrawnPayloadSchema,
} from "./resolution.events.payloads.js";

export const BoardroomEventTypes = [
  ...CommMeetingEventTypes,
  ...CommAgendaItemEventTypes,
  ...CommAttendeeEventTypes,
  ...CommResolutionEventTypes,
  ...CommMinutesEventTypes,
] as const;

const BoardroomOutboxEventNameSchema = z.enum(BoardroomEventTypes);

export const OutboxRecordSchema = z.object({
  id: z.string().uuid(),
  eventName: z.string(),
  payload: z.unknown(),
  createdAt: UtcDateTimeSchema,
  processedAt: UtcDateTimeSchema.nullable().optional(),
});

export type OutboxRecord = z.infer<typeof OutboxRecordSchema>;

export const BoardroomOutboxRecordSchema = OutboxRecordSchema.extend({
  eventName: BoardroomOutboxEventNameSchema,
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
    case CommMeetingEvents.Created:
      validatePayload(MeetingCreatedEventSchema);
      break;
    case CommMeetingEvents.Updated:
      validatePayload(MeetingUpdatedEventSchema);
      break;
    case CommMeetingEvents.Deleted:
      validatePayload(MeetingDeletedEventSchema);
      break;
    case CommMeetingEvents.Started:
      validatePayload(MeetingStartedEventSchema);
      break;
    case CommMeetingEvents.Adjourned:
      validatePayload(MeetingAdjournedEventSchema);
      break;
    case CommMeetingEvents.Cancelled:
      validatePayload(MeetingCancelledEventSchema);
      break;
    case CommMeetingEvents.Completed:
      validatePayload(MeetingCompletedEventSchema);
      break;
    case CommAgendaItemEvents.Added:
      validatePayload(AgendaItemAddedEventSchema);
      break;
    case CommAgendaItemEvents.Updated:
      validatePayload(AgendaItemUpdatedEventSchema);
      break;
    case CommAgendaItemEvents.Removed:
      validatePayload(AgendaItemRemovedEventSchema);
      break;
    case CommAttendeeEvents.Added:
      validatePayload(AttendeeAddedEventSchema);
      break;
    case CommAttendeeEvents.Updated:
      validatePayload(AttendeeUpdatedEventSchema);
      break;
    case CommAttendeeEvents.StatusUpdated:
      validatePayload(AttendeeStatusUpdatedEventSchema);
      break;
    case CommAttendeeEvents.Removed:
      validatePayload(AttendeeRemovedEventSchema);
      break;
    case CommResolutionEvents.Proposed:
      validatePayload(ResolutionProposedPayloadSchema);
      break;
    case CommResolutionEvents.Updated:
      validatePayload(ResolutionUpdatedPayloadSchema);
      break;
    case CommResolutionEvents.Withdrawn:
      validatePayload(ResolutionWithdrawnPayloadSchema);
      break;
    case CommResolutionEvents.VoteCast:
      validatePayload(ResolutionVoteCastPayloadSchema);
      break;
    case CommMinutesEvents.MinutesRecorded:
      validatePayload(MinutesRecordedEventSchema);
      break;
    case CommMinutesEvents.ActionItemCreated:
      validatePayload(ActionItemCreatedEventSchema);
      break;
    case CommMinutesEvents.ActionItemUpdated:
      validatePayload(ActionItemUpdatedEventSchema);
      break;
    case CommMinutesEvents.ActionItemDeleted:
      validatePayload(ActionItemDeletedEventSchema);
      break;
    default:
      break;
  }
});

export type BoardroomOutboxRecord = z.infer<typeof BoardroomOutboxRecordSchema>;
