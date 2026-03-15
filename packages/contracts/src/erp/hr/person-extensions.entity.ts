import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const HrmPersonAddressSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  personId: UuidSchema,
  addressType: z.string().trim().min(1).max(50),
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).nullable(),
  city: z.string().trim().max(120).nullable(),
  stateProvince: z.string().trim().max(120).nullable(),
  postalCode: z.string().trim().max(20).nullable(),
  countryCode: z.string().trim().length(3),
  isPrimary: z.boolean(),
});

export const HrmEmergencyContactSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  personId: UuidSchema,
  contactName: z.string().trim().min(1).max(255),
  relationship: z.string().trim().max(80).nullable(),
  phone: z.string().trim().min(1).max(50),
  email: z.string().email().max(320).nullable(),
  isPrimary: z.boolean(),
});

export const HrmDependentSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  personId: UuidSchema,
  dependentName: z.string().trim().min(1).max(255),
  relationship: z.string().trim().min(1).max(80),
  birthDate: DateSchema.nullable(),
});

export const HrmEmployeeDocumentSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  documentType: z.string().trim().min(1).max(80),
  fileReference: z.string().trim().min(1).max(512),
  issuedAt: DateSchema.nullable(),
  expiresAt: DateSchema.nullable(),
});

export type HrmPersonAddress = z.infer<typeof HrmPersonAddressSchema>;
export type HrmEmergencyContact = z.infer<typeof HrmEmergencyContactSchema>;
export type HrmDependent = z.infer<typeof HrmDependentSchema>;
export type HrmEmployeeDocument = z.infer<typeof HrmEmployeeDocumentSchema>;
