import { z } from "zod";

export const treasuryPostingBridgeStatusValues = ["requested", "posted", "failed"] as const;
export const treasuryPostingBridgeStatusSchema = z.enum(treasuryPostingBridgeStatusValues);

export const treasuryPostingBridgeEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: z.string().trim().min(1).max(64),
  sourceId: z.string().uuid(),
  treasuryAccountingPolicyId: z.string().uuid(),
  debitAccountCode: z.string().trim().min(1).max(64),
  creditAccountCode: z.string().trim().min(1).max(64),
  amountMinor: z.string(),
  currencyCode: z.string().trim().length(3),
  status: treasuryPostingBridgeStatusSchema,
  correlationId: z.string().trim().min(1).max(255),
  postedJournalEntryId: z.string().uuid().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TreasuryPostingBridgeEntity = z.infer<typeof treasuryPostingBridgeEntitySchema>;
