import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  MeetingAdjournNoteTextSchema,
  MeetingCancellationReasonTextSchema,
  MeetingCommandUpdateFieldsSchema,
  MeetingScheduledAtDefaultSchema,
  MeetingTitleSchema,
  withMeetingLifecycleTextRefinement,
  withMeetingUpdateRefinement,
} from "./meeting.shared.js";

const MeetingEventBaseSchema = z.object({
  meetingId: BoardMeetingIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommMeetingCreatedPayloadSchema = MeetingEventBaseSchema.extend({
  title: MeetingTitleSchema,
  chairId: PrincipalIdSchema,
  scheduledAt: MeetingScheduledAtDefaultSchema,
});

export const CommMeetingUpdatedPayloadSchema = withMeetingUpdateRefinement(
  MeetingEventBaseSchema.extend({
    ...MeetingCommandUpdateFieldsSchema.shape,
  }),
);
export const CommMeetingDeletedPayloadSchema = MeetingEventBaseSchema;

export const CommMeetingStartedPayloadSchema = MeetingEventBaseSchema.extend({
  startedAt: UtcDateTimeSchema,
});

export const CommMeetingAdjournedPayloadSchema = withMeetingLifecycleTextRefinement(
  MeetingEventBaseSchema.extend({
    adjournedAt: UtcDateTimeSchema,
    note: MeetingAdjournNoteTextSchema,
  }),
);

export const CommMeetingCancelledPayloadSchema = withMeetingLifecycleTextRefinement(
  MeetingEventBaseSchema.extend({
    reason: MeetingCancellationReasonTextSchema,
  }),
);

export const CommMeetingCompletedPayloadSchema = MeetingEventBaseSchema.extend({
  completedAt: UtcDateTimeSchema,
});

export const MeetingCreatedEventSchema = CommMeetingCreatedPayloadSchema;
export const MeetingUpdatedEventSchema = CommMeetingUpdatedPayloadSchema;
export const MeetingDeletedEventSchema = CommMeetingDeletedPayloadSchema;
export const MeetingStartedEventSchema = CommMeetingStartedPayloadSchema;
export const MeetingAdjournedEventSchema = CommMeetingAdjournedPayloadSchema;
export const MeetingCancelledEventSchema = CommMeetingCancelledPayloadSchema;
export const MeetingCompletedEventSchema = CommMeetingCompletedPayloadSchema;

export type CommMeetingCreatedPayload = z.infer<typeof CommMeetingCreatedPayloadSchema>;
export type CommMeetingUpdatedPayload = z.infer<typeof CommMeetingUpdatedPayloadSchema>;
export type CommMeetingDeletedPayload = z.infer<typeof CommMeetingDeletedPayloadSchema>;
export type CommMeetingStartedPayload = z.infer<typeof CommMeetingStartedPayloadSchema>;
export type CommMeetingAdjournedPayload = z.infer<typeof CommMeetingAdjournedPayloadSchema>;
export type CommMeetingCancelledPayload = z.infer<typeof CommMeetingCancelledPayloadSchema>;
export type CommMeetingCompletedPayload = z.infer<typeof CommMeetingCompletedPayloadSchema>;

export type MeetingCreatedEvent = z.infer<typeof MeetingCreatedEventSchema>;
export type MeetingUpdatedEvent = z.infer<typeof MeetingUpdatedEventSchema>;
export type MeetingDeletedEvent = z.infer<typeof MeetingDeletedEventSchema>;
export type MeetingStartedEvent = z.infer<typeof MeetingStartedEventSchema>;
export type MeetingAdjournedEvent = z.infer<typeof MeetingAdjournedEventSchema>;
export type MeetingCancelledEvent = z.infer<typeof MeetingCancelledEventSchema>;
export type MeetingCompletedEvent = z.infer<typeof MeetingCompletedEventSchema>;
