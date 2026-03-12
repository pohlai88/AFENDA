import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

export const LiquidityScenarioStatusValues = ["draft", "active", "inactive"] as const;
export const LiquidityScenarioStatusSchema = z.enum(LiquidityScenarioStatusValues);
export type LiquidityScenarioStatus = z.infer<typeof LiquidityScenarioStatusSchema>;

export const LiquidityScenarioTypeValues = [
  "base_case",
  "optimistic",
  "stress",
  "custom",
] as const;
export const LiquidityScenarioTypeSchema = z.enum(LiquidityScenarioTypeValues);
export type LiquidityScenarioType = z.infer<typeof LiquidityScenarioTypeSchema>;

export const LiquidityScenarioIdSchema = brandedUuid("LiquidityScenarioId");
export type LiquidityScenarioId = z.infer<typeof LiquidityScenarioIdSchema>;

export const LiquidityScenarioSchema = z.object({
  id: LiquidityScenarioIdSchema,
  orgId: OrgIdSchema,
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scenarioType: LiquidityScenarioTypeSchema,
  status: LiquidityScenarioStatusSchema,
  horizonDays: z.number().int().positive(),
  assumptionSetVersion: z.string().trim().min(1).max(128),
  assumptionsJson: z.record(z.string(), z.unknown()),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
export type LiquidityScenario = z.infer<typeof LiquidityScenarioSchema>;
