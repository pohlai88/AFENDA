import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreateTalentProfileCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  potentialScore: z.number().min(0).max(100).nullable().optional(),
  readinessScore: z.number().min(0).max(100).nullable().optional(),
  careerAspiration: z.string().max(2000).nullable().optional(),
});

export const CreateSuccessionPlanCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  positionId: UuidSchema,
  criticalRoleFlag: z.boolean().default(false),
});

export const NominateSuccessorCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  successionPlanId: UuidSchema,
  employmentId: UuidSchema,
  readinessLevel: z.string().trim().min(1).max(50),
});

export const CreateTalentProfileResultSchema = z.object({
  talentProfileId: UuidSchema,
});

export const CreateSuccessionPlanResultSchema = z.object({
  successionPlanId: UuidSchema,
  status: z.string(),
});

export const NominateSuccessorResultSchema = z.object({
  successorNominationId: UuidSchema,
});

export type CreateTalentProfileCommand = z.infer<typeof CreateTalentProfileCommandSchema>;
export type CreateSuccessionPlanCommand = z.infer<typeof CreateSuccessionPlanCommandSchema>;
export type NominateSuccessorCommand = z.infer<typeof NominateSuccessorCommandSchema>;
export type CreateTalentProfileResult = z.infer<typeof CreateTalentProfileResultSchema>;
export type CreateSuccessionPlanResult = z.infer<typeof CreateSuccessionPlanResultSchema>;
export type NominateSuccessorResult = z.infer<typeof NominateSuccessorResultSchema>;
