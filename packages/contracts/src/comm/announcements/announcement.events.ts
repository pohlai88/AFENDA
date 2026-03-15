export const COMM_ANNOUNCEMENT_PUBLISHED = "COMM.ANNOUNCEMENT_PUBLISHED" as const;
export const COMM_ANNOUNCEMENT_SCHEDULED = "COMM.ANNOUNCEMENT_SCHEDULED" as const;
export const COMM_ANNOUNCEMENT_ACKNOWLEDGED = "COMM.ANNOUNCEMENT_ACKNOWLEDGED" as const;
export const COMM_ANNOUNCEMENT_ARCHIVED = "COMM.ANNOUNCEMENT_ARCHIVED" as const;
export const COMM_ANNOUNCEMENT_CREATED = "COMM.ANNOUNCEMENT_CREATED" as const;

export const COMM_ANNOUNCEMENT_UPDATED = "COMM.ANNOUNCEMENT_UPDATED" as const;
export const COMM_ANNOUNCEMENT_RESCHEDULED = "COMM.ANNOUNCEMENT_RESCHEDULED" as const;
export const COMM_ANNOUNCEMENT_UNSCHEDULED = "COMM.ANNOUNCEMENT_UNSCHEDULED" as const;
export const COMM_ANNOUNCEMENT_UNARCHIVED = "COMM.ANNOUNCEMENT_UNARCHIVED" as const;

export const CommAnnouncementEvents = {
  Published: COMM_ANNOUNCEMENT_PUBLISHED,
  Scheduled: COMM_ANNOUNCEMENT_SCHEDULED,
  Acknowledged: COMM_ANNOUNCEMENT_ACKNOWLEDGED,
  Archived: COMM_ANNOUNCEMENT_ARCHIVED,
  Created: COMM_ANNOUNCEMENT_CREATED,
  Updated: COMM_ANNOUNCEMENT_UPDATED,
  Rescheduled: COMM_ANNOUNCEMENT_RESCHEDULED,
  Unscheduled: COMM_ANNOUNCEMENT_UNSCHEDULED,
  Unarchived: COMM_ANNOUNCEMENT_UNARCHIVED,
} as const;

export type CommAnnouncementEvent =
  (typeof CommAnnouncementEvents)[keyof typeof CommAnnouncementEvents];

export {
  AnnouncementAcknowledgedEventSchema,
  AnnouncementArchivedEventSchema,
  AnnouncementCreatedEventSchema,
  AnnouncementPublishedEventSchema,
  AnnouncementRescheduledEventSchema,
  AnnouncementScheduledEventSchema,
  AnnouncementUnarchivedEventSchema,
  AnnouncementUnscheduledEventSchema,
  AnnouncementUpdatedEventSchema,
  CommAnnouncementAcknowledgedPayloadSchema,
  CommAnnouncementArchivedPayloadSchema,
  CommAnnouncementCreatedPayloadSchema,
  CommAnnouncementPublishedPayloadSchema,
  CommAnnouncementRescheduledPayloadSchema,
  CommAnnouncementScheduledPayloadSchema,
  CommAnnouncementUnarchivedPayloadSchema,
  CommAnnouncementUnscheduledPayloadSchema,
  CommAnnouncementUpdatedPayloadSchema,
  CommAnnouncementUpdateSnapshotSchema,
} from "./announcement.events.payloads.js";

export type {
  AnnouncementAcknowledgedEvent,
  AnnouncementArchivedEvent,
  AnnouncementCreatedEvent,
  AnnouncementPublishedEvent,
  AnnouncementRescheduledEvent,
  AnnouncementScheduledEvent,
  AnnouncementUnarchivedEvent,
  AnnouncementUnscheduledEvent,
  AnnouncementUpdatedEvent,
  CommAnnouncementAcknowledgedPayload,
  CommAnnouncementArchivedPayload,
  CommAnnouncementCreatedPayload,
  CommAnnouncementPublishedPayload,
  CommAnnouncementRescheduledPayload,
  CommAnnouncementScheduledPayload,
  CommAnnouncementUnarchivedPayload,
  CommAnnouncementUnscheduledPayload,
  CommAnnouncementUpdatedPayload,
  CommAnnouncementUpdateSnapshot,
} from "./announcement.events.payloads.js";

/**
 * Aggregate of announcement-domain event types (used for outbox validation).
 *
 * Keep this list append-only: when new announcement events are introduced,
 * add them to CommAnnouncementEvents and append them here.
 */
export const AnnouncementEventTypes = [
  CommAnnouncementEvents.Published,
  CommAnnouncementEvents.Scheduled,
  CommAnnouncementEvents.Acknowledged,
  CommAnnouncementEvents.Archived,
  CommAnnouncementEvents.Created,
  CommAnnouncementEvents.Updated,
  CommAnnouncementEvents.Rescheduled,
  CommAnnouncementEvents.Unscheduled,
  CommAnnouncementEvents.Unarchived,
] as const;
