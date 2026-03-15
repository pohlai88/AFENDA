import { z } from "zod";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";
import { HrCaseEvidenceTypeSchema } from "./employee-relations.entity.js";

export const ListCasesByEmployeeQuerySchema = z.object({
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
});

export const ListOpenGrievanceCasesQuerySchema = z.object({
  orgId: OrgIdSchema,
});

export const ListOpenDisciplinaryActionsQuerySchema = z.object({
  orgId: OrgIdSchema,
});

export const ListCaseEvidenceQuerySchema = z.object({
  orgId: OrgIdSchema,
  caseType: HrCaseEvidenceTypeSchema,
  caseId: UuidSchema,
});

export const ListCasesByEmployeeResultSchema = z.object({
  grievanceCases: z.array(z.any()),
  disciplinaryActions: z.array(z.any()),
});

export const ListOpenGrievanceCasesResultSchema = z.object({
  cases: z.array(z.any()),
});

export const ListOpenDisciplinaryActionsResultSchema = z.object({
  actions: z.array(z.any()),
});

export const ListCaseEvidenceResultSchema = z.object({
  evidence: z.array(z.any()),
});

export type ListCasesByEmployeeQuery = z.infer<typeof ListCasesByEmployeeQuerySchema>;
export type ListOpenGrievanceCasesQuery = z.infer<typeof ListOpenGrievanceCasesQuerySchema>;
export type ListOpenDisciplinaryActionsQuery = z.infer<
  typeof ListOpenDisciplinaryActionsQuerySchema
>;
export type ListCaseEvidenceQuery = z.infer<typeof ListCaseEvidenceQuerySchema>;
