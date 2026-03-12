import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { LiquidityScenarioIdSchema, LiquidityScenarioTypeSchema } from "./liquidity-scenario.entity.js";

export const CreateLiquidityScenarioCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scenarioType: LiquidityScenarioTypeSchema,
  horizonDays: z.number().int().positive(),
  assumptionSetVersion: z.string().trim().min(1).max(128),
  assumptionsJson: z.record(z.string(), z.unknown()),
});
export type CreateLiquidityScenarioCommand = z.infer<typeof CreateLiquidityScenarioCommandSchema>;

export const ActivateLiquidityScenarioCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  liquidityScenarioId: LiquidityScenarioIdSchema,
});
export type ActivateLiquidityScenarioCommand = z.infer<typeof ActivateLiquidityScenarioCommandSchema>;
