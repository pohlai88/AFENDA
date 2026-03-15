import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const ListPayrollPeriodsQuerySchema = z.object({
  orgId: UuidSchema,
  status: z.enum(["open", "locked", "closed"]).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

export const GetPayrollRunQuerySchema = z.object({
  orgId: UuidSchema,
  payrollRunId: UuidSchema,
});

export const ListPayrollRunEmployeesQuerySchema = z.object({
  orgId: UuidSchema,
  payrollRunId: UuidSchema,
});

export const ListPayrollInputsQuerySchema = z.object({
  orgId: UuidSchema,
  payrollRunId: UuidSchema,
  employmentId: UuidSchema.optional(),
});

export type ListPayrollPeriodsQuery = z.infer<typeof ListPayrollPeriodsQuerySchema>;
export type GetPayrollRunQuery = z.infer<typeof GetPayrollRunQuerySchema>;
export type ListPayrollRunEmployeesQuery = z.infer<typeof ListPayrollRunEmployeesQuerySchema>;
export type ListPayrollInputsQuery = z.infer<typeof ListPayrollInputsQuerySchema>;
