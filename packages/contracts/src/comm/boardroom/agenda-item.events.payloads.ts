import { z } from "zod";
import { CorrelationIdSchema, OrgIdSchema } from "../../shared/ids.js";
import { BoardAgendaItemIdSchema } from "./agenda-item.entity.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  AgendaItemCommandUpdateFieldsSchema,
  AgendaItemSortOrderSchema,
  AgendaItemTitleSchema,
} from "./agenda-item.shared.js";

const AgendaItemEventBaseSchema = z.object({
  agendaItemId: BoardAgendaItemIdSchema,
  meetingId: BoardMeetingIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

const AgendaItemAddedEventFieldsSchema = z.object({
  title: AgendaItemTitleSchema,
  sortOrder: AgendaItemSortOrderSchema,
  presenterId: AgendaItemCommandUpdateFieldsSchema.shape.presenterId.default(null),
});

export const CommAgendaItemAddedPayloadSchema = AgendaItemEventBaseSchema.extend(
  AgendaItemAddedEventFieldsSchema.shape,
);

export const CommAgendaItemUpdatedPayloadSchema = AgendaItemEventBaseSchema.extend(
  AgendaItemCommandUpdateFieldsSchema.shape,
);
export const CommAgendaItemRemovedPayloadSchema = AgendaItemEventBaseSchema;

export const AgendaItemAddedEventSchema = CommAgendaItemAddedPayloadSchema;
export const AgendaItemUpdatedEventSchema = CommAgendaItemUpdatedPayloadSchema;
export const AgendaItemRemovedEventSchema = CommAgendaItemRemovedPayloadSchema;

export type CommAgendaItemAddedPayload = z.infer<typeof CommAgendaItemAddedPayloadSchema>;
export type CommAgendaItemUpdatedPayload = z.infer<typeof CommAgendaItemUpdatedPayloadSchema>;
export type CommAgendaItemRemovedPayload = z.infer<typeof CommAgendaItemRemovedPayloadSchema>;

export type AgendaItemAddedEvent = z.infer<typeof AgendaItemAddedEventSchema>;
export type AgendaItemUpdatedEvent = z.infer<typeof AgendaItemUpdatedEventSchema>;
export type AgendaItemRemovedEvent = z.infer<typeof AgendaItemRemovedEventSchema>;
