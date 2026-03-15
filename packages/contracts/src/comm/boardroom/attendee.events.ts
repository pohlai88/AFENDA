export const CommAttendeeEvents = {
  Added: "COMM.ATTENDEE_ADDED",
  Updated: "COMM.ATTENDEE_UPDATED",
  StatusUpdated: "COMM.ATTENDEE_STATUS_UPDATED",
  Removed: "COMM.ATTENDEE_REMOVED",
} as const;

export const COMM_ATTENDEE_ADDED = CommAttendeeEvents.Added;
export const COMM_ATTENDEE_UPDATED = CommAttendeeEvents.Updated;
export const COMM_ATTENDEE_STATUS_UPDATED = CommAttendeeEvents.StatusUpdated;
export const COMM_ATTENDEE_REMOVED = CommAttendeeEvents.Removed;

export type CommAttendeeEvent =
  typeof CommAttendeeEvents[keyof typeof CommAttendeeEvents];

export const CommAttendeeEventTypes = Object.values(
  CommAttendeeEvents,
) as readonly CommAttendeeEvent[];

export {
  AttendeeAddedEventSchema,
  AttendeeUpdatedEventSchema,
  AttendeeStatusUpdatedEventSchema,
  AttendeeRemovedEventSchema,
  CommAttendeeAddedPayloadSchema,
  CommAttendeeUpdatedPayloadSchema,
  CommAttendeeStatusUpdatedPayloadSchema,
  CommAttendeeRemovedPayloadSchema,
} from "./attendee.events.payloads.js";

export type {
  AttendeeAddedEvent,
  AttendeeUpdatedEvent,
  AttendeeStatusUpdatedEvent,
  AttendeeRemovedEvent,
  CommAttendeeAddedPayload,
  CommAttendeeUpdatedPayload,
  CommAttendeeStatusUpdatedPayload,
  CommAttendeeRemovedPayload,
} from "./attendee.events.payloads.js";

export const BoardAttendeeEventTypes = CommAttendeeEventTypes;

export const AttendeeEventTypes = BoardAttendeeEventTypes;
