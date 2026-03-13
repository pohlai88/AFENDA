/**
 * Board meeting attendee entity schema.
 */
import { z } from "zod";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";

/** ID brand */
export const BoardMeetingAttendeeIdSchema = UuidSchema.brand<"BoardMeetingAttendeeId">();

/** Status values */
export const AttendeeStatusValues = ["invited", "confirmed", "attended", "absent"] as const;

export const AttendeeStatusSchema = z.enum(AttendeeStatusValues);

/** Reusable string schema */
const RoleSchema = z.string().trim().max(64);

export const BoardMeetingAttendeeSchema = z
  .object({
    id: BoardMeetingAttendeeIdSchema,
    orgId: OrgIdSchema,
    meetingId: BoardMeetingIdSchema,
    principalId: PrincipalIdSchema,
    status: AttendeeStatusSchema,
    role: RoleSchema.nullable().default(null), // e.g. "member", "observer"
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.role !== null && data.role.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Role must be non-empty if provided.",
        path: ["role"],
      });
    }
  });

/** Types */
export type BoardMeetingAttendeeId = z.infer<typeof BoardMeetingAttendeeIdSchema>;
export type AttendeeStatus = z.infer<typeof AttendeeStatusSchema>;
export type BoardMeetingAttendee = z.infer<typeof BoardMeetingAttendeeSchema>;
