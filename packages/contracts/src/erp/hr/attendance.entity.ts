import { z } from "zod";
import { UtcDateTimeSchema, DateSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const HrmShiftTypeValues = ["fixed", "flex", "rotational"] as const;
export const HrmAttendanceStatusValues = [
  "present",
  "absent",
  "late",
  "half_day",
  "leave",
  "holiday",
] as const;

export const HrmShiftTypeSchema = z.enum(HrmShiftTypeValues);
export const HrmAttendanceStatusSchema = z.enum(HrmAttendanceStatusValues);

export const HrmShiftSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  shiftCode: z.string().trim().min(1).max(50),
  shiftName: z.string().trim().min(1).max(255),
  shiftType: HrmShiftTypeSchema,
  startTime: z.string().trim().min(1).max(8),
  endTime: z.string().trim().min(1).max(8),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmAttendanceRecordSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  workDate: DateSchema,
  attendanceStatus: HrmAttendanceStatusSchema,
  checkInAt: UtcDateTimeSchema.nullable(),
  checkOutAt: UtcDateTimeSchema.nullable(),
  source: z.string().trim().min(1).max(50).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmShift = z.infer<typeof HrmShiftSchema>;
export type HrmAttendanceRecord = z.infer<typeof HrmAttendanceRecordSchema>;
