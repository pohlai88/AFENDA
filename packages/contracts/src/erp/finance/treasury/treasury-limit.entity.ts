import { z } from "zod";
import { treasuryPolicyScopeTypeSchema } from "./treasury-policy.entity";

export const treasuryLimitStatusValues = ["draft", "active", "inactive"] as const;
export const treasuryLimitMetricValues = [
  "single_amount_minor",
  "daily_total_minor",
  "monthly_total_minor",
] as const;

export const treasuryLimitStatusSchema = z.enum(treasuryLimitStatusValues);
export const treasuryLimitMetricSchema = z.enum(treasuryLimitMetricValues);

export const treasuryLimitEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  policyId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3).nullable(),
  metric: treasuryLimitMetricSchema,
  thresholdMinor: z.string(),
  hardBlock: z.boolean(),
  status: treasuryLimitStatusSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const treasuryLimitBreachEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  treasuryLimitId: z.string().uuid(),
  sourceType: treasuryPolicyScopeTypeSchema,
  sourceId: z.string().uuid(),
  measuredValueMinor: z.string(),
  thresholdMinor: z.string(),
  hardBlock: z.boolean(),
  overrideRequested: z.boolean(),
  overrideApprovedByUserId: z.string().uuid().nullable(),
  overrideReason: z.string().nullable(),
  correlationId: z.string(),
  createdAt: z.string().datetime(),
});

export type TreasuryLimitEntity = z.infer<typeof treasuryLimitEntitySchema>;
export type TreasuryLimitBreachEntity = z.infer<typeof treasuryLimitBreachEntitySchema>;
