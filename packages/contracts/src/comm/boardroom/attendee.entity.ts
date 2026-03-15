/**
 * Board meeting attendee entity schema.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { AttendeeNullableRoleSchema } from "./attendee.shared.js";

/** ID brand */
export const BoardMeetingAttendeeIdSchema = UuidSchema.brand<"BoardMeetingAttendeeId">();

/** Status values */
export const AttendeeStatuses = {
  Invited: "invited",
  Confirmed: "confirmed",
  Attended: "attended",
  Absent: "absent",
} as const;

export const AttendeeStatusValues = [
  AttendeeStatuses.Invited,
  AttendeeStatuses.Confirmed,
  AttendeeStatuses.Attended,
  AttendeeStatuses.Absent,
] as const;

export const AttendeeStatusSchema = z.enum(AttendeeStatusValues);

export const BoardMeetingAttendeeSchema = z.object({
  id: BoardMeetingAttendeeIdSchema,
  orgId: OrgIdSchema,
  meetingId: BoardMeetingIdSchema,
  principalId: PrincipalIdSchema,
  status: AttendeeStatusSchema,
  role: AttendeeNullableRoleSchema.default(null), // e.g. "member", "observer"
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

/** Types */
export type BoardMeetingAttendeeId = z.infer<typeof BoardMeetingAttendeeIdSchema>;
export type AttendeeStatus = z.infer<typeof AttendeeStatusSchema>;
export type BoardMeetingAttendee = z.infer<typeof BoardMeetingAttendeeSchema>;
