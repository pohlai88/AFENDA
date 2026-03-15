import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const WorkforcePlanStatusValues = ["draft", "active", "locked"] as const;
export const WorkforcePlanStatusSchema = z.enum(WorkforcePlanStatusValues);

export const HrmWorkforcePlanSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  planCode: z.string().trim().min(1).max(50),
  planName: z.string().trim().min(1).max(255),
  planYear: z.number().int().min(2000).max(2100),
  status: z.enum(WorkforcePlanStatusValues),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmWorkforceScenarioSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  workforcePlanId: UuidSchema,
  scenarioName: z.string().trim().min(1).max(255),
  assumptionsJson: z.record(z.unknown()).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPositionBudgetSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  orgUnitId: UuidSchema,
  positionId: UuidSchema,
  planYear: z.number().int().min(2000).max(2100),
  approvedHeadcount: z.number().int().min(0),
  budgetAmount: z.bigint(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmHiringForecastSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  workforcePlanId: UuidSchema,
  positionId: UuidSchema,
  quarter: z.string().trim().min(1).max(20),
  plannedHires: z.number().int().min(0),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmLaborCostProjectionSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  workforcePlanId: UuidSchema,
  scenarioId: UuidSchema,
  orgUnitId: UuidSchema,
  projectedAmount: z.bigint(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmWorkforcePlan = z.infer<typeof HrmWorkforcePlanSchema>;
export type HrmWorkforceScenario = z.infer<typeof HrmWorkforceScenarioSchema>;
export type HrmPositionBudget = z.infer<typeof HrmPositionBudgetSchema>;
export type HrmHiringForecast = z.infer<typeof HrmHiringForecastSchema>;
export type HrmLaborCostProjection = z.infer<typeof HrmLaborCostProjectionSchema>;
