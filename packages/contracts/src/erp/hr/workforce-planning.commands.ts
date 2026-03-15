import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";
import { WorkforcePlanStatusSchema } from "./workforce-planning.entity.js";

export const CreateWorkforcePlanCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  planCode: z.string().trim().min(1).max(50),
  planName: z.string().trim().min(1).max(255),
  planYear: z.number().int().min(2000).max(2100),
  status: WorkforcePlanStatusSchema.default("draft"),
});

export const CreateScenarioCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  workforcePlanId: UuidSchema,
  scenarioName: z.string().trim().min(1).max(255),
  assumptionsJson: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const SetPositionBudgetCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  orgUnitId: UuidSchema,
  positionId: UuidSchema,
  planYear: z.number().int().min(2000).max(2100),
  approvedHeadcount: z.number().int().min(0),
  budgetAmount: z.coerce.bigint(),
});

export const CreateHiringForecastCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  workforcePlanId: UuidSchema,
  positionId: UuidSchema,
  quarter: z.string().trim().min(1).max(20),
  plannedHires: z.number().int().min(0),
});

export const CreateWorkforcePlanResultSchema = z.object({
  workforcePlanId: UuidSchema,
});

export const CreateScenarioResultSchema = z.object({
  scenarioId: UuidSchema,
});

export const SetPositionBudgetResultSchema = z.object({
  positionBudgetId: UuidSchema,
});

export const CreateHiringForecastResultSchema = z.object({
  hiringForecastId: UuidSchema,
});

export type CreateWorkforcePlanCommand = z.infer<typeof CreateWorkforcePlanCommandSchema>;
export type CreateScenarioCommand = z.infer<typeof CreateScenarioCommandSchema>;
export type SetPositionBudgetCommand = z.infer<typeof SetPositionBudgetCommandSchema>;
export type CreateHiringForecastCommand = z.infer<typeof CreateHiringForecastCommandSchema>;
export type CreateWorkforcePlanResult = z.infer<typeof CreateWorkforcePlanResultSchema>;
export type CreateScenarioResult = z.infer<typeof CreateScenarioResultSchema>;
export type SetPositionBudgetResult = z.infer<typeof SetPositionBudgetResultSchema>;
export type CreateHiringForecastResult = z.infer<typeof CreateHiringForecastResultSchema>;
