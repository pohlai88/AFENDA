import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreatePolicyDocumentCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  documentCode: z.string().trim().min(1).max(50),
  documentName: z.string().trim().min(1).max(255),
  version: z.string().trim().min(1).max(50),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  requiredRole: z.string().trim().max(100).nullable().optional(),
});

export const RecordPolicyAcknowledgementCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  policyDocumentId: UuidSchema,
  ipAddress: z.string().trim().max(45).nullable().optional(),
});

export const CreateComplianceCheckCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  checkType: z.string().trim().min(1).max(100),
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["pending", "passed", "failed", "overdue"]).default("pending"),
});

export const RecordWorkPermitCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  permitType: z.string().trim().min(1).max(100),
  permitNumber: z.string().trim().min(1).max(100),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const CreatePolicyDocumentResultSchema = z.object({
  policyDocumentId: UuidSchema,
});

export const RecordPolicyAcknowledgementResultSchema = z.object({
  acknowledgementId: UuidSchema,
});

export const CreateComplianceCheckResultSchema = z.object({
  complianceCheckId: UuidSchema,
  status: z.string(),
});

export const RecordWorkPermitResultSchema = z.object({
  workPermitId: UuidSchema,
});

export type CreatePolicyDocumentCommand = z.infer<typeof CreatePolicyDocumentCommandSchema>;
export type RecordPolicyAcknowledgementCommand = z.infer<
  typeof RecordPolicyAcknowledgementCommandSchema
>;
export type CreateComplianceCheckCommand = z.infer<typeof CreateComplianceCheckCommandSchema>;
export type RecordWorkPermitCommand = z.infer<typeof RecordWorkPermitCommandSchema>;
export type CreatePolicyDocumentResult = z.infer<typeof CreatePolicyDocumentResultSchema>;
export type RecordPolicyAcknowledgementResult = z.infer<
  typeof RecordPolicyAcknowledgementResultSchema
>;
export type CreateComplianceCheckResult = z.infer<typeof CreateComplianceCheckResultSchema>;
export type RecordWorkPermitResult = z.infer<typeof RecordWorkPermitResultSchema>;
