export const CommMeetingEvents = {
  Created: "COMM.MEETING_CREATED",
  Updated: "COMM.MEETING_UPDATED",
  // Deleted represents hard removal of the meeting record.
  Deleted: "COMM.MEETING_DELETED",
  Started: "COMM.MEETING_STARTED",
  Adjourned: "COMM.MEETING_ADJOURNED",
  // Cancelled represents business cancellation of a scheduled/in-flight meeting.
  Cancelled: "COMM.MEETING_CANCELLED",
  Completed: "COMM.MEETING_COMPLETED",
} as const;

export const COMM_MEETING_CREATED = CommMeetingEvents.Created;
export const COMM_MEETING_UPDATED = CommMeetingEvents.Updated;
export const COMM_MEETING_DELETED = CommMeetingEvents.Deleted;
export const COMM_MEETING_STARTED = CommMeetingEvents.Started;
export const COMM_MEETING_ADJOURNED = CommMeetingEvents.Adjourned;
export const COMM_MEETING_CANCELLED = CommMeetingEvents.Cancelled;
export const COMM_MEETING_COMPLETED = CommMeetingEvents.Completed;

export type CommMeetingEvent =
  typeof CommMeetingEvents[keyof typeof CommMeetingEvents];

export const CommMeetingEventTypes = Object.values(
  CommMeetingEvents,
) as readonly CommMeetingEvent[];

export {
  CommMeetingCreatedPayloadSchema,
  CommMeetingUpdatedPayloadSchema,
  CommMeetingDeletedPayloadSchema,
  CommMeetingStartedPayloadSchema,
  CommMeetingAdjournedPayloadSchema,
  CommMeetingCancelledPayloadSchema,
  CommMeetingCompletedPayloadSchema,
  MeetingCreatedEventSchema,
  MeetingUpdatedEventSchema,
  MeetingDeletedEventSchema,
  MeetingStartedEventSchema,
  MeetingAdjournedEventSchema,
  MeetingCancelledEventSchema,
  MeetingCompletedEventSchema,
} from "./meeting.events.payloads.js";

export type {
  CommMeetingCreatedPayload,
  CommMeetingUpdatedPayload,
  CommMeetingDeletedPayload,
  CommMeetingStartedPayload,
  CommMeetingAdjournedPayload,
  CommMeetingCancelledPayload,
  CommMeetingCompletedPayload,
  MeetingCreatedEvent,
  MeetingUpdatedEvent,
  MeetingDeletedEvent,
  MeetingStartedEvent,
  MeetingAdjournedEvent,
  MeetingCancelledEvent,
  MeetingCompletedEvent,
} from "./meeting.events.payloads.js";

export const BoardMeetingEventTypes = CommMeetingEventTypes;

export const MeetingEventTypes = BoardMeetingEventTypes;
