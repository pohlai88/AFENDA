import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreateOrgUnitCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  legalEntityId: UuidSchema,
  orgUnitCode: z.string().trim().min(1).max(50).optional(),
  orgUnitName: z.string().trim().min(1).max(255),
  parentOrgUnitId: UuidSchema.optional(),
  status: z.string().trim().max(50).optional(),
});

export const CreateGradeCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  gradeCode: z.string().trim().min(1).max(50).optional(),
  gradeName: z.string().trim().min(1).max(255),
  gradeRank: z.number().int().optional(),
  minSalaryAmount: z.string().trim().min(1).optional(),
  midSalaryAmount: z.string().trim().min(1).optional(),
  maxSalaryAmount: z.string().trim().min(1).optional(),
});

export const CreateJobCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  jobCode: z.string().trim().min(1).max(50).optional(),
  jobTitle: z.string().trim().min(1).max(255),
  status: z.string().trim().max(50).optional(),
});

export const CreatePositionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  positionCode: z.string().trim().min(1).max(50).optional(),
  positionTitle: z.string().trim().min(1).max(255),
  legalEntityId: UuidSchema,
  orgUnitId: UuidSchema.optional(),
  jobId: UuidSchema.optional(),
  gradeId: UuidSchema.optional(),
  positionStatus: z.string().trim().max(50).optional(),
  isBudgeted: z.boolean().optional(),
  headcountLimit: z.number().int().optional(),
  effectiveFrom: z.string().min(1),
});

export const AssignPositionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  positionId: UuidSchema,
  effectiveFrom: z.string().min(1),
  changeReason: z.string().trim().min(1).max(500).optional(),
});

export const ClosePositionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  positionId: UuidSchema,
  effectiveTo: z.string().min(1),
});

export const CreateOrgUnitResultSchema = z.object({
  orgUnitId: UuidSchema,
  orgUnitCode: z.string(),
});

export const CreateGradeResultSchema = z.object({
  gradeId: UuidSchema,
  gradeCode: z.string(),
});

export const CreateJobResultSchema = z.object({
  jobId: UuidSchema,
  jobCode: z.string(),
});

export const CreatePositionResultSchema = z.object({
  positionId: UuidSchema,
  positionCode: z.string(),
});

export const AssignPositionResultSchema = z.object({
  previousWorkAssignmentId: UuidSchema,
  newWorkAssignmentId: UuidSchema,
});

export const ClosePositionResultSchema = z.object({
  positionId: UuidSchema,
  previousStatus: z.string(),
  currentStatus: z.string(),
});

export type CreateOrgUnitCommand = z.infer<typeof CreateOrgUnitCommandSchema>;
export type CreateGradeCommand = z.infer<typeof CreateGradeCommandSchema>;
export type CreateJobCommand = z.infer<typeof CreateJobCommandSchema>;
export type CreatePositionCommand = z.infer<typeof CreatePositionCommandSchema>;
export type AssignPositionCommand = z.infer<typeof AssignPositionCommandSchema>;
export type ClosePositionCommand = z.infer<typeof ClosePositionCommandSchema>;
export type CreateOrgUnitResult = z.infer<typeof CreateOrgUnitResultSchema>;
export type CreateGradeResult = z.infer<typeof CreateGradeResultSchema>;
export type CreateJobResult = z.infer<typeof CreateJobResultSchema>;
export type CreatePositionResult = z.infer<typeof CreatePositionResultSchema>;
export type AssignPositionResult = z.infer<typeof AssignPositionResultSchema>;
export type ClosePositionResult = z.infer<typeof ClosePositionResultSchema>;
