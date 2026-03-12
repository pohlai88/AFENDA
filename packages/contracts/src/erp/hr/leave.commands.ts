import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreateLeaveRequestCommandSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    employmentId: UuidSchema,
    leaveTypeId: UuidSchema,
    startDate: DateSchema,
    endDate: DateSchema,
    requestedAmount: z.string().min(1).max(50),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be <= endDate",
    path: ["endDate"],
  });

export const ApproveLeaveRequestCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  leaveRequestId: UuidSchema,
  approved: z.boolean(),
  rejectionReason: z.string().trim().min(1).max(500).optional(),
});

export const RecalculateLeaveBalanceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  leaveTypeId: UuidSchema,
  accrualPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  openingBalance: z.string().trim().min(1).max(50).optional(),
  accruedAmount: z.string().trim().min(1).max(50).optional(),
});

export type CreateLeaveRequestCommand = z.infer<typeof CreateLeaveRequestCommandSchema>;
export type ApproveLeaveRequestCommand = z.infer<typeof ApproveLeaveRequestCommandSchema>;
export type RecalculateLeaveBalanceCommand = z.infer<typeof RecalculateLeaveBalanceCommandSchema>;
