import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { BoardActionItemIdSchema, BoardMinuteIdSchema } from "./minutes.entity.js";
import {
  ActionItemAssigneeIdDefaultSchema,
  ActionItemDueDateNullableDefaultSchema,
  ActionItemStatusNullableSchema,
  ActionItemTitleSchema,
  MinutesResolutionIdDefaultSchema,
  UpdateActionItemCommandFieldsSchema,
  withActionItemRefinements,
  withDueDateFutureRefinement,
} from "./minutes.shared.js";

const MinuteEventBaseSchema = z.object({
  minuteId: BoardMinuteIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

const ActionItemEventBaseSchema = z.object({
  actionItemId: BoardActionItemIdSchema,
  minuteId: BoardMinuteIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommMinutesRecordedPayloadSchema = MinuteEventBaseSchema.extend({
  meetingId: BoardMeetingIdSchema,
  resolutionId: MinutesResolutionIdDefaultSchema,
  recordedAt: UtcDateTimeSchema,
});

export const CommActionItemCreatedPayloadSchema = ActionItemEventBaseSchema.extend({
  title: ActionItemTitleSchema,
  assigneeId: ActionItemAssigneeIdDefaultSchema,
  dueDate: ActionItemDueDateNullableDefaultSchema,
});

export const CommActionItemUpdatedPayloadSchema = withDueDateFutureRefinement(
  withActionItemRefinements(
    ActionItemEventBaseSchema.extend({
      ...UpdateActionItemCommandFieldsSchema.shape,
      status: ActionItemStatusNullableSchema.optional(),
      closedAt: UtcDateTimeSchema.nullable().optional(),
      updatedByPrincipalId: PrincipalIdSchema.optional(),
    }),
  ),
);

export const CommActionItemDeletedPayloadSchema = ActionItemEventBaseSchema;

export const MinutesRecordedEventSchema = CommMinutesRecordedPayloadSchema;
export const ActionItemCreatedEventSchema = CommActionItemCreatedPayloadSchema;
export const ActionItemUpdatedEventSchema = CommActionItemUpdatedPayloadSchema;
export const ActionItemDeletedEventSchema = CommActionItemDeletedPayloadSchema;

export type CommMinutesRecordedPayload = z.infer<typeof CommMinutesRecordedPayloadSchema>;
export type CommActionItemCreatedPayload = z.infer<typeof CommActionItemCreatedPayloadSchema>;
export type CommActionItemUpdatedPayload = z.infer<typeof CommActionItemUpdatedPayloadSchema>;
export type CommActionItemDeletedPayload = z.infer<typeof CommActionItemDeletedPayloadSchema>;

export type MinutesRecordedEvent = z.infer<typeof MinutesRecordedEventSchema>;
export type ActionItemCreatedEvent = z.infer<typeof ActionItemCreatedEventSchema>;
export type ActionItemUpdatedEvent = z.infer<typeof ActionItemUpdatedEventSchema>;
export type ActionItemDeletedEvent = z.infer<typeof ActionItemDeletedEventSchema>;
