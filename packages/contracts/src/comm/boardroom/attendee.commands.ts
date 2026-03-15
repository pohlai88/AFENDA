import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import { BoardMeetingIdSchema } from "./meeting.entity.js";
import { AttendeeStatusSchema, BoardMeetingAttendeeIdSchema } from "./attendee.entity.js";
import {
  AttendeeNullableRoleOptionalSchema,
  AttendeeNullableRoleSchema,
  withAttendeeUpdateRefinement,
} from "./attendee.shared.js";

/** Base schema for attendee commands */
const AttendeeCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

/** Add attendee */
export const AddAttendeeCommandSchema = AttendeeCommandBase.extend({
  meetingId: BoardMeetingIdSchema,
  principalId: PrincipalIdSchema,
  role: AttendeeNullableRoleSchema.default(null),
});

const AttendeeUpdateBaseSchema = AttendeeCommandBase.extend({
  attendeeId: BoardMeetingAttendeeIdSchema,
});

/** Update attendee status */
export const UpdateAttendeeStatusCommandSchema = AttendeeUpdateBaseSchema.extend({
  status: AttendeeStatusSchema,
});

/** Update attendee (status and/or role) */
export const UpdateAttendeeCommandSchema = withAttendeeUpdateRefinement(
  AttendeeUpdateBaseSchema.extend({
    status: AttendeeStatusSchema.optional(),
    role: AttendeeNullableRoleOptionalSchema,
  }),
);

/** Remove attendee */
export const RemoveAttendeeCommandSchema = AttendeeUpdateBaseSchema;

/** Types */
export type AddAttendeeCommand = z.infer<typeof AddAttendeeCommandSchema>;
export type UpdateAttendeeStatusCommand = z.infer<typeof UpdateAttendeeStatusCommandSchema>;
export type UpdateAttendeeCommand = z.infer<typeof UpdateAttendeeCommandSchema>;
export type RemoveAttendeeCommand = z.infer<typeof RemoveAttendeeCommandSchema>;
