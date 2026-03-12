import { z } from "zod";

export const treasuryBankAccountStatusSchema = z.enum([
  "draft",
  "active",
  "inactive",
  "closed",
]);

export type TreasuryBankAccountStatus = z.infer<
  typeof treasuryBankAccountStatusSchema
>;

export const treasuryBankStatementStatusSchema = z.enum([
  "received",
  "parsing",
  "parsed",
  "failed",
  "archived",
]);

export type TreasuryBankStatementStatus = z.infer<
  typeof treasuryBankStatementStatusSchema
>;

export const treasuryReconciliationStateSchema = z.enum([
  "unreconciled",
  "partially_reconciled",
  "reconciled",
]);

export type TreasuryReconciliationState = z.infer<
  typeof treasuryReconciliationStateSchema
>;

export const treasuryCashDirectionSchema = z.enum(["inflow", "outflow"]);

export type TreasuryCashDirection = z.infer<typeof treasuryCashDirectionSchema>;

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128);

export const orgScopedMetadataSchema = z.object({
  orgId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  correlationId: z.string().min(8).max(128),
});

export type OrgScopedMetadata = z.infer<typeof orgScopedMetadataSchema>;
