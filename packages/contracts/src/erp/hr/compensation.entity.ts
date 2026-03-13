import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const HrmPayBasisValues = ["annual", "monthly", "hourly", "daily"] as const;
export const HrmBenefitPlanTypeValues = [
  "health",
  "dental",
  "vision",
  "life_insurance",
  "retirement",
  "other",
] as const;
export const HrmBenefitEnrollmentStatusValues = ["active", "waived", "terminated"] as const;

export const HrmPayBasisSchema = z.enum(HrmPayBasisValues);
export const HrmBenefitPlanTypeSchema = z.enum(HrmBenefitPlanTypeValues);
export const HrmBenefitEnrollmentStatusSchema = z.enum(HrmBenefitEnrollmentStatusValues);

export const HrmCompensationStructureSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  structureCode: z.string().trim().min(1).max(50),
  structureName: z.string().trim().min(1).max(255),
  payBasis: HrmPayBasisSchema,
  currencyCode: z.string().trim().length(3),
  minAmount: z.string(),
  maxAmount: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmEmployeeCompensationPackageSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  compensationStructureId: UuidSchema,
  salaryAmount: z.string(),
  effectiveFrom: UtcDateTimeSchema,
  effectiveTo: UtcDateTimeSchema.nullable(),
  isCurrent: z.boolean(),
  changeReason: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmSalaryChangeHistorySchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  compensationStructureId: UuidSchema,
  previousAmount: z.string().nullable(),
  newAmount: z.string(),
  effectiveFrom: UtcDateTimeSchema,
  changeReason: z.string().nullable(),
  recordedBy: UuidSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmBenefitPlanSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  planCode: z.string().trim().min(1).max(50),
  planName: z.string().trim().min(1).max(255),
  planType: HrmBenefitPlanTypeSchema,
  providerName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmBenefitEnrollmentSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  benefitPlanId: UuidSchema,
  enrollmentStatus: HrmBenefitEnrollmentStatusSchema,
  enrolledAt: UtcDateTimeSchema,
  terminatedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
