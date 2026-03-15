import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const HrmWorkerTypeValues = ["employee", "contractor", "intern", "director"] as const;
export const HrmEmploymentTypeValues = [
  "permanent",
  "contract",
  "temporary",
  "internship",
  "outsourced",
] as const;
export const HrmEmploymentStatusValues = [
  "draft",
  "active",
  "probation",
  "suspended",
  "terminated",
  "inactive",
] as const;

export const HrmWorkerTypeSchema = z.enum(HrmWorkerTypeValues);
export const HrmEmploymentTypeSchema = z.enum(HrmEmploymentTypeValues);
export const HrmEmploymentStatusSchema = z.enum(HrmEmploymentStatusValues);

export const HrmPersonSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  personCode: z.string().trim().min(1).max(50),
  legalName: z.string().trim().min(1).max(255),
  preferredName: z.string().trim().max(255).nullable(),
  firstName: z.string().trim().min(1).max(120),
  middleName: z.string().trim().max(120).nullable(),
  lastName: z.string().trim().min(1).max(120),
  displayName: z.string().trim().max(255).nullable(),
  birthDate: DateSchema.nullable(),
  genderCode: z.string().trim().max(50).nullable(),
  maritalStatusCode: z.string().trim().max(50).nullable(),
  nationalityCountryCode: z.string().trim().max(3).nullable(),
  personalEmail: z.string().email().max(320).nullable(),
  mobilePhone: z.string().trim().max(50).nullable(),
  status: z.string().trim().min(1).max(50),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmEmployeeProfileSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  personId: UuidSchema,
  employeeCode: z.string().trim().min(1).max(50),
  workerType: HrmWorkerTypeSchema,
  currentStatus: z.string().trim().min(1).max(50),
  primaryLegalEntityId: UuidSchema.nullable(),
  primaryEmploymentId: UuidSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmEmploymentRecordSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employeeId: UuidSchema,
  legalEntityId: UuidSchema,
  employmentNumber: z.string().trim().min(1).max(50),
  employmentType: HrmEmploymentTypeSchema,
  hireDate: DateSchema,
  startDate: DateSchema,
  probationEndDate: DateSchema.nullable(),
  terminationDate: DateSchema.nullable(),
  employmentStatus: HrmEmploymentStatusSchema,
  payrollStatus: z.string().trim().min(1).max(50),
  isPrimary: z.boolean(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPersonIdentitySchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  personId: UuidSchema,
  identityType: z.string().trim().min(1).max(50),
  identityNumber: z.string().trim().min(1).max(120),
  issuingCountryCode: z.string().trim().length(3).nullable(),
  issuedAt: DateSchema.nullable(),
  expiresAt: DateSchema.nullable(),
  isPrimary: z.boolean(),
  verificationStatus: z.string().trim().min(1).max(50),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmPerson = z.infer<typeof HrmPersonSchema>;
export type HrmEmployeeProfile = z.infer<typeof HrmEmployeeProfileSchema>;
export type HrmEmploymentRecord = z.infer<typeof HrmEmploymentRecordSchema>;
export type HrmPersonIdentity = z.infer<typeof HrmPersonIdentitySchema>;
