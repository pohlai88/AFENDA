import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const HrmLeaveUnitValues = ["day", "hour"] as const;
export const HrmLeaveRequestStatusValues = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const HrmLeaveUnitSchema = z.enum(HrmLeaveUnitValues);
export const HrmLeaveRequestStatusSchema = z.enum(HrmLeaveRequestStatusValues);

export const HrmLeaveTypeSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  leaveTypeCode: z.string().trim().min(1).max(50),
  leaveTypeName: z.string().trim().min(1).max(255),
  leaveUnit: HrmLeaveUnitSchema,
  isPaid: z.boolean(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmLeaveBalanceSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  leaveTypeId: UuidSchema,
  accrualPeriod: z.string().trim().min(1).max(20),
  openingBalance: z.string(),
  accruedAmount: z.string(),
  consumedAmount: z.string(),
  closingBalance: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmLeaveRequestSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  leaveTypeId: UuidSchema,
  startDate: DateSchema,
  endDate: DateSchema,
  requestedAmount: z.string(),
  status: HrmLeaveRequestStatusSchema,
  reason: z.string().trim().max(500).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmLeaveType = z.infer<typeof HrmLeaveTypeSchema>;
export type HrmLeaveBalance = z.infer<typeof HrmLeaveBalanceSchema>;
export type HrmLeaveRequest = z.infer<typeof HrmLeaveRequestSchema>;
