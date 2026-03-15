import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";
import {
  DisciplinaryActionStatusSchema,
  DisciplinaryActionTypeSchema,
  EvidenceTypeSchema,
  GrievanceCaseStatusSchema,
  GrievanceCaseTypeSchema,
  HrCaseEvidenceTypeSchema,
} from "./employee-relations.entity.js";

export const CreateGrievanceCaseCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  caseType: GrievanceCaseTypeSchema,
  status: GrievanceCaseStatusSchema.default("open"),
});

export const CreateDisciplinaryActionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  actionType: DisciplinaryActionTypeSchema,
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: DisciplinaryActionStatusSchema.default("draft"),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const HrAttachEvidenceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  caseType: HrCaseEvidenceTypeSchema,
  caseId: UuidSchema,
  evidenceType: EvidenceTypeSchema,
  fileReference: z.string().trim().max(500).nullable().optional(),
});

export const CloseGrievanceCaseCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  grievanceCaseId: UuidSchema,
  resolutionNotes: z.string().trim().max(2000).nullable().optional(),
});

export const CloseDisciplinaryActionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  disciplinaryActionId: UuidSchema,
  status: z.enum(["active", "rescinded"]),
});

export const CreateGrievanceCaseResultSchema = z.object({
  grievanceCaseId: UuidSchema,
});

export const CreateDisciplinaryActionResultSchema = z.object({
  disciplinaryActionId: UuidSchema,
});

export const HrAttachEvidenceResultSchema = z.object({
  evidenceId: UuidSchema,
});

export const CloseGrievanceCaseResultSchema = z.object({
  grievanceCaseId: UuidSchema,
});

export const CloseDisciplinaryActionResultSchema = z.object({
  disciplinaryActionId: UuidSchema,
});

export type CreateGrievanceCaseCommand = z.infer<typeof CreateGrievanceCaseCommandSchema>;
export type CreateDisciplinaryActionCommand = z.infer<typeof CreateDisciplinaryActionCommandSchema>;
export type HrAttachEvidenceCommand = z.infer<typeof HrAttachEvidenceCommandSchema>;
export type CloseGrievanceCaseCommand = z.infer<typeof CloseGrievanceCaseCommandSchema>;
export type CloseDisciplinaryActionCommand = z.infer<typeof CloseDisciplinaryActionCommandSchema>;
export type CreateGrievanceCaseResult = z.infer<typeof CreateGrievanceCaseResultSchema>;
export type CreateDisciplinaryActionResult = z.infer<typeof CreateDisciplinaryActionResultSchema>;
export type HrAttachEvidenceResult = z.infer<typeof HrAttachEvidenceResultSchema>;
export type CloseGrievanceCaseResult = z.infer<typeof CloseGrievanceCaseResultSchema>;
export type CloseDisciplinaryActionResult = z.infer<typeof CloseDisciplinaryActionResultSchema>;
