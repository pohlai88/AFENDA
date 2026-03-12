import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { treasuryLimitMetricSchema } from "./treasury-limit.entity";
import { treasuryPolicyScopeTypeSchema } from "./treasury-policy.entity";

export const createTreasuryLimitCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  policyId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3).nullable().optional(),
  metric: treasuryLimitMetricSchema,
  thresholdMinor: z.string(),
  hardBlock: z.boolean(),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateTreasuryLimitCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryLimitId: z.string().uuid(),
});

export const approveTreasuryLimitOverrideCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryLimitBreachId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export type CreateTreasuryLimitCommand = z.infer<typeof createTreasuryLimitCommandSchema>;
export type ActivateTreasuryLimitCommand = z.infer<typeof activateTreasuryLimitCommandSchema>;
export type ApproveTreasuryLimitOverrideCommand = z.infer<
  typeof approveTreasuryLimitOverrideCommandSchema
>;
