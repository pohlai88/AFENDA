export const COMM_CHATTER_MESSAGE_POSTED = "COMM.CHATTER_MESSAGE_POSTED" as const;
export const COMM_CHATTER_MESSAGE_UPDATED = "COMM.CHATTER_MESSAGE_UPDATED" as const;
export const COMM_CHATTER_MESSAGE_DELETED = "COMM.CHATTER_MESSAGE_DELETED" as const;

export const CommChatterEvents = {
  MessagePosted: COMM_CHATTER_MESSAGE_POSTED,
  MessageUpdated: COMM_CHATTER_MESSAGE_UPDATED,
  MessageDeleted: COMM_CHATTER_MESSAGE_DELETED,
} as const;

export type CommChatterEvent = (typeof CommChatterEvents)[keyof typeof CommChatterEvents];

/**
 * Aggregate of chatter-domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const CommChatterEventTypes = [
  CommChatterEvents.MessagePosted,
  CommChatterEvents.MessageUpdated,
  CommChatterEvents.MessageDeleted,
] as const;

export const ChatterEventTypes = CommChatterEventTypes;

export {
  ChatterEventPayloadSchemas,
  ChatterMessageDeletedEventSchema,
  ChatterMessagePostedEventSchema,
  ChatterMessageUpdatedEventSchema,
  CommChatterMessageDeletedPayloadSchema,
  CommChatterMessagePostedPayloadSchema,
  CommChatterMessageUpdatedPayloadSchema,
} from "./chatter.events.payloads.js";

export type {
  ChatterMessageDeletedEvent,
  ChatterMessagePostedEvent,
  ChatterMessageUpdatedEvent,
  CommChatterMessageDeletedPayload,
  CommChatterMessagePostedPayload,
  CommChatterMessageUpdatedPayload,
} from "./chatter.events.payloads.js";
