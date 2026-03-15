import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const OpenPayrollPeriodCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  periodCode: z.string().trim().min(1).max(50),
  periodStartDate: DateSchema,
  periodEndDate: DateSchema,
  paymentDate: DateSchema,
});

export const LockPayrollPeriodCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollPeriodId: UuidSchema,
});

export const CreatePayrollRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollPeriodId: UuidSchema,
  runNumber: z.string().trim().min(1).max(50).optional(),
  runType: z.enum(["regular", "off_cycle"]).default("regular"),
});

export const SubmitPayrollRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollRunId: UuidSchema,
});

export const ApprovePayrollRunCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollRunId: UuidSchema,
});

export const OpenPayrollPeriodResultSchema = z.object({
  payrollPeriodId: UuidSchema,
  periodCode: z.string(),
  periodStatus: z.string(),
});

export const LockPayrollPeriodResultSchema = z.object({
  payrollPeriodId: UuidSchema,
  periodStatus: z.string(),
});

export const CreatePayrollRunResultSchema = z.object({
  payrollRunId: UuidSchema,
  runNumber: z.string(),
  status: z.string(),
});

export const SubmitPayrollRunResultSchema = z.object({
  payrollRunId: UuidSchema,
  status: z.string(),
});

export const ApprovePayrollRunResultSchema = z.object({
  payrollRunId: UuidSchema,
  status: z.string(),
});

export const PublishPayslipsCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollRunId: UuidSchema,
});

export const PublishPayslipsResultSchema = z.object({
  payrollRunId: UuidSchema,
  payslipsPublished: z.number().int().nonnegative(),
});

export const GeneratePaymentBatchCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollRunId: UuidSchema,
});

export const GeneratePaymentBatchResultSchema = z.object({
  payrollRunId: UuidSchema,
  paymentBatchId: UuidSchema,
  batchNumber: z.string(),
  instructionCount: z.number().int().nonnegative(),
});

export const PostPayrollToGlCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  payrollRunId: UuidSchema,
  payrollPayableAccountCode: z.string().trim().min(1).max(20).optional(),
});

export const PostPayrollToGlResultSchema = z.object({
  payrollRunId: UuidSchema,
  payrollGlPostingId: UuidSchema,
  journalEntryId: UuidSchema.nullable(),
  status: z.string(),
});

export type OpenPayrollPeriodCommand = z.infer<typeof OpenPayrollPeriodCommandSchema>;
export type LockPayrollPeriodCommand = z.infer<typeof LockPayrollPeriodCommandSchema>;
export type CreatePayrollRunCommand = z.infer<typeof CreatePayrollRunCommandSchema>;
export type SubmitPayrollRunCommand = z.infer<typeof SubmitPayrollRunCommandSchema>;
export type ApprovePayrollRunCommand = z.infer<typeof ApprovePayrollRunCommandSchema>;
export type OpenPayrollPeriodResult = z.infer<typeof OpenPayrollPeriodResultSchema>;
export type LockPayrollPeriodResult = z.infer<typeof LockPayrollPeriodResultSchema>;
export type CreatePayrollRunResult = z.infer<typeof CreatePayrollRunResultSchema>;
export type SubmitPayrollRunResult = z.infer<typeof SubmitPayrollRunResultSchema>;
export type ApprovePayrollRunResult = z.infer<typeof ApprovePayrollRunResultSchema>;
export type PublishPayslipsCommand = z.infer<typeof PublishPayslipsCommandSchema>;
export type PublishPayslipsResult = z.infer<typeof PublishPayslipsResultSchema>;
export type GeneratePaymentBatchCommand = z.infer<typeof GeneratePaymentBatchCommandSchema>;
export type GeneratePaymentBatchResult = z.infer<typeof GeneratePaymentBatchResultSchema>;
export type PostPayrollToGlCommand = z.infer<typeof PostPayrollToGlCommandSchema>;
export type PostPayrollToGlResult = z.infer<typeof PostPayrollToGlResultSchema>;
