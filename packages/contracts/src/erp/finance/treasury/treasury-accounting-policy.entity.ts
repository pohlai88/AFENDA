import { z } from "zod";

export const treasuryAccountingPolicyStatusValues = ["draft", "active", "inactive"] as const;
export const treasuryAccountingPolicyScopeValues = [
  "payment_batch",
  "intercompany_transfer",
  "netting_session",
  "fx_revaluation",
] as const;

export const treasuryAccountingPolicyStatusSchema = z.enum(treasuryAccountingPolicyStatusValues);
export const treasuryAccountingPolicyScopeSchema = z.enum(treasuryAccountingPolicyScopeValues);

export const treasuryAccountingPolicyEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  policyCode: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  scopeType: treasuryAccountingPolicyScopeSchema,
  debitAccountCode: z.string().trim().min(1).max(64),
  creditAccountCode: z.string().trim().min(1).max(64),
  status: treasuryAccountingPolicyStatusSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryAccountingPolicyEntity = z.infer<typeof treasuryAccountingPolicyEntitySchema>;
