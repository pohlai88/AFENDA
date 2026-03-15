export const CommMinutesEvents = {
  MinutesRecorded: "COMM.MINUTES_RECORDED",
  ActionItemCreated: "COMM.ACTION_ITEM_CREATED",
  ActionItemUpdated: "COMM.ACTION_ITEM_UPDATED",
  ActionItemDeleted: "COMM.ACTION_ITEM_DELETED",
} as const;

export type CommMinutesEvent = (typeof CommMinutesEvents)[keyof typeof CommMinutesEvents];

export const CommMinutesEventTypes = Object.values(
  CommMinutesEvents,
) as readonly CommMinutesEvent[];

export const MinutesEventTypes = CommMinutesEventTypes;

export {
  ActionItemCreatedEventSchema,
  ActionItemDeletedEventSchema,
  ActionItemUpdatedEventSchema,
  CommActionItemCreatedPayloadSchema,
  CommActionItemDeletedPayloadSchema,
  CommActionItemUpdatedPayloadSchema,
  CommMinutesRecordedPayloadSchema,
  MinutesRecordedEventSchema,
} from "./minutes.events.payloads.js";

export type {
  ActionItemCreatedEvent,
  ActionItemDeletedEvent,
  ActionItemUpdatedEvent,
  CommActionItemCreatedPayload,
  CommActionItemDeletedPayload,
  CommActionItemUpdatedPayload,
  CommMinutesRecordedPayload,
  MinutesRecordedEvent,
} from "./minutes.events.payloads.js";
