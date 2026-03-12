import { z } from "zod";
import { TreasuryBaseCommandSchema } from "./treasury-shared.commands.js";
import { treasuryAccountingPolicyScopeSchema } from "./treasury-accounting-policy.entity.js";

export const createTreasuryAccountingPolicyCommandSchema = TreasuryBaseCommandSchema.merge(
  z.object({
    policyCode: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(255),
    scopeType: treasuryAccountingPolicyScopeSchema,
    debitAccountCode: z.string().trim().min(1).max(64),
    creditAccountCode: z.string().trim().min(1).max(64),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().optional().nullable(),
  }),
);

export const activateTreasuryAccountingPolicyCommandSchema = TreasuryBaseCommandSchema.merge(
  z.object({
    treasuryAccountingPolicyId: z.string().uuid(),
  }),
);

export type CreateTreasuryAccountingPolicyCommand = z.infer<
  typeof createTreasuryAccountingPolicyCommandSchema
>;
export type ActivateTreasuryAccountingPolicyCommand = z.infer<
  typeof activateTreasuryAccountingPolicyCommandSchema
>;
