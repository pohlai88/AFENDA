import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { AttendeeStatusSchema, BoardMeetingAttendeeIdSchema } from "./attendee.entity.js";

/** Base schema for attendee commands */
const AttendeeCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

/** Add attendee */
export const AddAttendeeCommandSchema = AttendeeCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
  principalId: PrincipalIdSchema,
  role: z.string().trim().max(64).nullable().default(null),
});

/** Update attendee status */
export const UpdateAttendeeStatusCommandSchema = AttendeeCommandBase.extend({
  attendeeId: BoardMeetingAttendeeIdSchema,
  status: AttendeeStatusSchema,
});

/** Update attendee (status and/or role) */
export const UpdateAttendeeCommandSchema = AttendeeCommandBase.extend({
  attendeeId: BoardMeetingAttendeeIdSchema,
  status: AttendeeStatusSchema.optional(),
  role: z.string().trim().max(64).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.status === undefined && data.role === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of status or role must be provided.",
      path: [],
    });
  }
  if (data.role !== null && data.role !== undefined && data.role.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Role must be non-empty if provided.",
      path: ["role"],
    });
  }
});

/** Remove attendee */
export const RemoveAttendeeCommandSchema = AttendeeCommandBase.extend({
  attendeeId: BoardMeetingAttendeeIdSchema,
});

/** Types */
export type AddAttendeeCommand = z.infer<typeof AddAttendeeCommandSchema>;
export type UpdateAttendeeStatusCommand = z.infer<typeof UpdateAttendeeStatusCommandSchema>;
export type UpdateAttendeeCommand = z.infer<typeof UpdateAttendeeCommandSchema>;
export type RemoveAttendeeCommand = z.infer<typeof RemoveAttendeeCommandSchema>;
