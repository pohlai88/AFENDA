import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const ComplianceCheckStatusValues = ["pending", "passed", "failed", "overdue"] as const;
export const ComplianceCheckStatusSchema = z.enum(ComplianceCheckStatusValues);

export const HrmPolicyDocumentSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  documentCode: z.string().trim().min(1).max(50),
  documentName: z.string().trim().min(1).max(255),
  version: z.string().trim().min(1).max(50),
  effectiveFrom: DateSchema,
  effectiveTo: DateSchema.nullable(),
  requiredRole: z.string().trim().max(100).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPolicyAcknowledgementSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  policyDocumentId: UuidSchema,
  acknowledgedAt: UtcDateTimeSchema,
  ipAddress: z.string().trim().max(45).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmComplianceCheckSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  checkType: z.string().trim().min(1).max(100),
  checkDate: DateSchema,
  dueDate: DateSchema.nullable(),
  status: z.enum(ComplianceCheckStatusValues),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmWorkPermitRecordSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  permitType: z.string().trim().min(1).max(100),
  permitNumber: z.string().trim().min(1).max(100),
  issuedDate: DateSchema,
  expiryDate: DateSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmPolicyDocument = z.infer<typeof HrmPolicyDocumentSchema>;
export type HrmPolicyAcknowledgement = z.infer<typeof HrmPolicyAcknowledgementSchema>;
export type HrmComplianceCheck = z.infer<typeof HrmComplianceCheckSchema>;
export type HrmWorkPermitRecord = z.infer<typeof HrmWorkPermitRecordSchema>;
