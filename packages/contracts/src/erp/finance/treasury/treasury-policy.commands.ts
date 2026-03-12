import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { treasuryPolicyScopeTypeSchema } from "./treasury-policy.entity";

export const createTreasuryPolicyCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3).nullable().optional(),
  allowOverride: z.boolean(),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateTreasuryPolicyCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  treasuryPolicyId: z.string().uuid(),
});

export type CreateTreasuryPolicyCommand = z.infer<typeof createTreasuryPolicyCommandSchema>;
export type ActivateTreasuryPolicyCommand = z.infer<typeof activateTreasuryPolicyCommandSchema>;
