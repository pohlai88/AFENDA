import { z } from "zod";

export const treasuryPolicyStatusValues = ["draft", "active", "inactive"] as const;

export const treasuryPolicyScopeTypeValues = [
  "payment_instruction",
  "payment_batch",
  "intercompany_transfer",
  "netting_session",
  "fx_exposure",
  "revaluation_event",
] as const;

export const treasuryPolicyStatusSchema = z.enum(treasuryPolicyStatusValues);
export const treasuryPolicyScopeTypeSchema = z.enum(treasuryPolicyScopeTypeValues);

export const treasuryPolicyEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scopeType: treasuryPolicyScopeTypeSchema,
  legalEntityId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3).nullable(),
  allowOverride: z.boolean(),
  status: treasuryPolicyStatusSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryPolicyEntity = z.infer<typeof treasuryPolicyEntitySchema>;
