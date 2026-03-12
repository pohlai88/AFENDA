import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { UuidSchema } from "../../shared/ids.js";
import { HrmAttendanceStatusSchema } from "./attendance.entity.js";

export const RecordAttendanceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  workDate: DateSchema,
  attendanceStatus: HrmAttendanceStatusSchema,
  checkInAt: UtcDateTimeSchema.optional(),
  checkOutAt: UtcDateTimeSchema.optional(),
  source: z.string().trim().min(1).max(50).optional(),
});

export type RecordAttendanceCommand = z.infer<typeof RecordAttendanceCommandSchema>;

export const CreateRosterAssignmentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  shiftId: UuidSchema,
  workDate: DateSchema,
  status: z.string().trim().min(1).max(50).optional(),
});

export type CreateRosterAssignmentCommand = z.infer<typeof CreateRosterAssignmentCommandSchema>;
