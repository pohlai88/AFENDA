import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const HrmPayrollPeriodStatusValues = ["open", "locked", "closed"] as const;
export const HrmPayrollRunStatusValues = ["draft", "submitted", "approved", "cancelled"] as const;
export const HrmPayrollRunTypeValues = ["regular", "off_cycle"] as const;
export const HrmPayrollElementCategoryValues = [
  "earning",
  "deduction",
  "employer_cost",
  "tax",
] as const;

export const HrmPayrollPeriodStatusSchema = z.enum(HrmPayrollPeriodStatusValues);
export const HrmPayrollRunStatusSchema = z.enum(HrmPayrollRunStatusValues);
export const HrmPayrollRunTypeSchema = z.enum(HrmPayrollRunTypeValues);
export const HrmPayrollElementCategorySchema = z.enum(HrmPayrollElementCategoryValues);

export const HrmPayrollPeriodSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  periodCode: z.string().trim().min(1).max(50),
  periodStartDate: DateSchema,
  periodEndDate: DateSchema,
  paymentDate: DateSchema,
  periodStatus: HrmPayrollPeriodStatusSchema,
  lockedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollRunSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollPeriodId: UuidSchema,
  runType: HrmPayrollRunTypeSchema,
  runNumber: z.string().trim().min(1).max(50),
  status: HrmPayrollRunStatusSchema,
  submittedAt: UtcDateTimeSchema.nullable(),
  submittedBy: UuidSchema.nullable(),
  approvedAt: UtcDateTimeSchema.nullable(),
  approvedBy: UuidSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollRunEmployeeSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollRunId: UuidSchema,
  employmentId: UuidSchema,
  currencyCode: z.string().trim().length(3),
  grossAmount: z.string(),
  deductionAmount: z.string(),
  employerCostAmount: z.string(),
  netAmount: z.string(),
  status: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollInputSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollRunId: UuidSchema,
  employmentId: UuidSchema,
  inputType: z.string().trim().min(1).max(50),
  inputCode: z.string().trim().min(1).max(50),
  sourceModule: z.string().trim().min(1).max(50),
  sourceReferenceId: UuidSchema.nullable(),
  quantity: z.string().nullable(),
  rate: z.string().nullable(),
  amount: z.string().nullable(),
  currencyCode: z.string().nullable(),
  effectiveDate: DateSchema.nullable(),
  status: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollElementSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  elementCode: z.string().trim().min(1).max(50),
  elementName: z.string().trim().min(1).max(255),
  elementCategory: HrmPayrollElementCategorySchema,
  glMappingCode: z.string().nullable(),
  sequenceNo: z.string().nullable(),
  status: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollResultLineSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollRunEmployeeId: UuidSchema,
  payrollElementId: UuidSchema,
  lineType: z.string().trim().min(1).max(50),
  quantity: z.string().nullable(),
  rate: z.string().nullable(),
  baseAmount: z.string().nullable(),
  calculatedAmount: z.string(),
  currencyCode: z.string().trim().length(3),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayslipStatusValues = ["draft", "published"] as const;
export const HrmPayslipStatusSchema = z.enum(HrmPayslipStatusValues);

export const HrmPayslipSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollRunEmployeeId: UuidSchema,
  payslipNumber: z.string().trim().min(1).max(50),
  publishedAt: UtcDateTimeSchema.nullable(),
  accessStatus: z.string().default("published"),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollPaymentBatchStatusValues = ["draft", "submitted", "processed"] as const;
export const HrmPayrollPaymentBatchStatusSchema = z.enum(HrmPayrollPaymentBatchStatusValues);

export const HrmPayrollPaymentBatchSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollRunId: UuidSchema,
  batchNumber: z.string().trim().min(1).max(50),
  totalAmount: z.string(),
  currencyCode: z.string().trim().length(3),
  status: HrmPayrollPaymentBatchStatusSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollPaymentInstructionSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  paymentBatchId: UuidSchema,
  payrollRunEmployeeId: UuidSchema,
  amount: z.string(),
  currencyCode: z.string().trim().length(3),
  status: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollGlPostingStatusValues = ["pending", "posted", "failed"] as const;
export const HrmPayrollGlPostingStatusSchema = z.enum(HrmPayrollGlPostingStatusValues);

export const HrmPayrollGlPostingSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollRunId: UuidSchema,
  journalEntryId: UuidSchema.nullable(),
  postingStatus: HrmPayrollGlPostingStatusSchema,
  postedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPayrollGlPostingLineSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  payrollGlPostingId: UuidSchema,
  accountId: UuidSchema,
  debitMinor: z.bigint(),
  creditMinor: z.bigint(),
  currencyCode: z.string().trim().length(3),
  memo: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmPayrollPeriod = z.infer<typeof HrmPayrollPeriodSchema>;
export type HrmPayrollRun = z.infer<typeof HrmPayrollRunSchema>;
export type HrmPayrollRunEmployee = z.infer<typeof HrmPayrollRunEmployeeSchema>;
export type HrmPayrollInput = z.infer<typeof HrmPayrollInputSchema>;
export type HrmPayrollElement = z.infer<typeof HrmPayrollElementSchema>;
export type HrmPayrollResultLine = z.infer<typeof HrmPayrollResultLineSchema>;
export type HrmPayslip = z.infer<typeof HrmPayslipSchema>;
export type HrmPayrollPaymentBatch = z.infer<typeof HrmPayrollPaymentBatchSchema>;
export type HrmPayrollPaymentInstruction = z.infer<typeof HrmPayrollPaymentInstructionSchema>;
export type HrmPayrollGlPosting = z.infer<typeof HrmPayrollGlPostingSchema>;
export type HrmPayrollGlPostingLine = z.infer<typeof HrmPayrollGlPostingLineSchema>;
