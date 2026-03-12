import { z } from "zod";
import { TreasuryBaseCommandSchema } from "./treasury-shared.commands.js";

export const requestTreasuryPostingCommandSchema = TreasuryBaseCommandSchema.merge(
  z.object({
    sourceType: z.string().trim().min(1).max(64),
    sourceId: z.string().uuid(),
    treasuryAccountingPolicyId: z.string().uuid(),
    amountMinor: z.string(),
    currencyCode: z.string().trim().length(3),
  }),
);

export type RequestTreasuryPostingCommand = z.infer<typeof requestTreasuryPostingCommandSchema>;
