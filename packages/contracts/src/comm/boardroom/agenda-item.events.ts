export const CommAgendaItemEvents = {
  Added: "COMM.AGENDA_ITEM_ADDED",
  Updated: "COMM.AGENDA_ITEM_UPDATED",
  Removed: "COMM.AGENDA_ITEM_REMOVED",
} as const;

export const COMM_AGENDA_ITEM_ADDED = CommAgendaItemEvents.Added;
export const COMM_AGENDA_ITEM_UPDATED = CommAgendaItemEvents.Updated;
export const COMM_AGENDA_ITEM_REMOVED = CommAgendaItemEvents.Removed;

export type CommAgendaItemEvent =
  typeof CommAgendaItemEvents[keyof typeof CommAgendaItemEvents];

export const CommAgendaItemEventTypes = Object.values(
  CommAgendaItemEvents,
) as readonly CommAgendaItemEvent[];

export {
  AgendaItemAddedEventSchema,
  AgendaItemUpdatedEventSchema,
  AgendaItemRemovedEventSchema,
  CommAgendaItemAddedPayloadSchema,
  CommAgendaItemUpdatedPayloadSchema,
  CommAgendaItemRemovedPayloadSchema,
} from "./agenda-item.events.payloads.js";

export type {
  AgendaItemAddedEvent,
  AgendaItemUpdatedEvent,
  AgendaItemRemovedEvent,
  CommAgendaItemAddedPayload,
  CommAgendaItemUpdatedPayload,
  CommAgendaItemRemovedPayload,
} from "./agenda-item.events.payloads.js";

export const BoardAgendaItemEventTypes = CommAgendaItemEventTypes;

export const AgendaItemEventTypes = BoardAgendaItemEventTypes;
