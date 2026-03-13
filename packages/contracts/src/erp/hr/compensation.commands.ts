import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreateCompensationStructureCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  structureCode: z.string().trim().min(1).max(50),
  structureName: z.string().trim().min(1).max(255),
  payBasis: z.enum(["annual", "monthly", "hourly", "daily"]),
  currencyCode: z.string().trim().length(3),
  minAmount: z.string().min(1),
  maxAmount: z.string().min(1).optional(),
});

export const AssignCompensationPackageCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  compensationStructureId: UuidSchema,
  salaryAmount: z.string().min(1),
  effectiveFrom: z.string().min(1),
  changeReason: z.string().trim().min(1).max(500).optional(),
});

export const ProcessSalaryChangeCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  newAmount: z.string().min(1),
  effectiveFrom: z.string().min(1),
  changeReason: z.string().trim().min(1).max(500).optional(),
});

export const CreateBenefitPlanCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  planCode: z.string().trim().min(1).max(50),
  planName: z.string().trim().min(1).max(255),
  planType: z.enum(["health", "dental", "vision", "life_insurance", "retirement", "other"]),
  providerName: z.string().trim().min(1).max(255).optional(),
});

export const EnrollBenefitCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  benefitPlanId: UuidSchema,
});

export type CreateCompensationStructureCommand = z.infer<
  typeof CreateCompensationStructureCommandSchema
>;
export type AssignCompensationPackageCommand = z.infer<
  typeof AssignCompensationPackageCommandSchema
>;
export type ProcessSalaryChangeCommand = z.infer<typeof ProcessSalaryChangeCommandSchema>;
export type CreateBenefitPlanCommand = z.infer<typeof CreateBenefitPlanCommandSchema>;
export type EnrollBenefitCommand = z.infer<typeof EnrollBenefitCommandSchema>;
