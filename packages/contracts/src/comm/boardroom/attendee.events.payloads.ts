import { z } from "zod";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { AttendeeStatusSchema, BoardMeetingAttendeeIdSchema } from "./attendee.entity.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import {
  AttendeeNullableRoleOptionalSchema,
  AttendeeNullableRoleSchema,
  withAttendeeUpdateRefinement,
} from "./attendee.shared.js";

const AttendeeEventBaseSchema = z.object({
  attendeeId: BoardMeetingAttendeeIdSchema,
  meetingId: BoardMeetingIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommAttendeeAddedPayloadSchema = AttendeeEventBaseSchema.extend({
  principalId: PrincipalIdSchema,
  role: AttendeeNullableRoleSchema.default(null),
});

export const CommAttendeeUpdatedPayloadSchema = withAttendeeUpdateRefinement(
  AttendeeEventBaseSchema.extend({
    status: AttendeeStatusSchema.optional(),
    role: AttendeeNullableRoleOptionalSchema,
  }),
);

export const CommAttendeeStatusUpdatedPayloadSchema = AttendeeEventBaseSchema.extend({
  status: AttendeeStatusSchema,
});

export const CommAttendeeRemovedPayloadSchema = AttendeeEventBaseSchema;

export const AttendeeAddedEventSchema = CommAttendeeAddedPayloadSchema;
export const AttendeeUpdatedEventSchema = CommAttendeeUpdatedPayloadSchema;
export const AttendeeStatusUpdatedEventSchema = CommAttendeeStatusUpdatedPayloadSchema;
export const AttendeeRemovedEventSchema = CommAttendeeRemovedPayloadSchema;

export type CommAttendeeAddedPayload = z.infer<typeof CommAttendeeAddedPayloadSchema>;
export type CommAttendeeUpdatedPayload = z.infer<typeof CommAttendeeUpdatedPayloadSchema>;
export type CommAttendeeStatusUpdatedPayload = z.infer<
  typeof CommAttendeeStatusUpdatedPayloadSchema
>;
export type CommAttendeeRemovedPayload = z.infer<typeof CommAttendeeRemovedPayloadSchema>;

export type AttendeeAddedEvent = z.infer<typeof AttendeeAddedEventSchema>;
export type AttendeeUpdatedEvent = z.infer<typeof AttendeeUpdatedEventSchema>;
export type AttendeeStatusUpdatedEvent = z.infer<typeof AttendeeStatusUpdatedEventSchema>;
export type AttendeeRemovedEvent = z.infer<typeof AttendeeRemovedEventSchema>;
