import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const SuccessionPlanStatusValues = ["draft", "active", "closed"] as const;
export const SuccessionPlanStatusSchema = z.enum(SuccessionPlanStatusValues);

export const HrmTalentProfileSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  potentialScore: z.number().min(0).max(100).nullable(),
  readinessScore: z.number().min(0).max(100).nullable(),
  careerAspiration: z.string().max(2000).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmSuccessionPlanSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  positionId: UuidSchema,
  criticalRoleFlag: z.boolean(),
  status: SuccessionPlanStatusSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmSuccessorNominationSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  successionPlanId: UuidSchema,
  employmentId: UuidSchema,
  readinessLevel: z.string().trim().min(1).max(50),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmTalentProfile = z.infer<typeof HrmTalentProfileSchema>;
export type HrmSuccessionPlan = z.infer<typeof HrmSuccessionPlanSchema>;
export type HrmSuccessorNomination = z.infer<typeof HrmSuccessorNominationSchema>;
