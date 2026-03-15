import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const GrievanceCaseTypeValues = ["grievance", "complaint", "harassment", "other"] as const;
export const GrievanceCaseTypeSchema = z.enum(GrievanceCaseTypeValues);

export const GrievanceCaseStatusValues = ["open", "investigating", "resolved", "closed"] as const;
export const GrievanceCaseStatusSchema = z.enum(GrievanceCaseStatusValues);

export const DisciplinaryActionTypeValues = [
  "warning",
  "written_warning",
  "suspension",
  "termination",
  "other",
] as const;
export const DisciplinaryActionTypeSchema = z.enum(DisciplinaryActionTypeValues);

export const DisciplinaryActionStatusValues = ["draft", "active", "rescinded"] as const;
export const DisciplinaryActionStatusSchema = z.enum(DisciplinaryActionStatusValues);

export const HrCaseEvidenceTypeValues = ["grievance", "disciplinary"] as const;
export const HrCaseEvidenceTypeSchema = z.enum(HrCaseEvidenceTypeValues);

export const EvidenceTypeValues = ["document", "note", "email", "witness_statement", "other"] as const;
export const EvidenceTypeSchema = z.enum(EvidenceTypeValues);

export const HrmGrievanceCaseSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  caseType: GrievanceCaseTypeSchema,
  openedAt: UtcDateTimeSchema,
  status: GrievanceCaseStatusSchema,
  resolvedAt: UtcDateTimeSchema.nullable(),
  resolutionNotes: z.string().trim().max(2000).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmDisciplinaryActionSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  actionType: DisciplinaryActionTypeSchema,
  effectiveDate: DateSchema,
  status: DisciplinaryActionStatusSchema,
  notes: z.string().trim().max(2000).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmHrCaseEvidenceSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  caseType: HrCaseEvidenceTypeSchema,
  caseId: UuidSchema,
  evidenceType: EvidenceTypeSchema,
  fileReference: z.string().trim().max(500).nullable(),
  recordedAt: UtcDateTimeSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmGrievanceCase = z.infer<typeof HrmGrievanceCaseSchema>;
export type HrmDisciplinaryAction = z.infer<typeof HrmDisciplinaryActionSchema>;
export type HrmHrCaseEvidence = z.infer<typeof HrmHrCaseEvidenceSchema>;
