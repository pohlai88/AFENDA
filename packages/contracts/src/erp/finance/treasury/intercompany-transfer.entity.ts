import { z } from "zod";

export const intercompanyTransferStatusValues = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "pending_settlement",
  "settled",
  "failed",
  "cancelled",
] as const;

export const intercompanyTransferPurposeValues = [
  "working_capital",
  "funding",
  "settlement",
  "cash_pooling",
  "manual_adjustment",
] as const;

export const intercompanyTransferStatusSchema = z.enum(intercompanyTransferStatusValues);

export const intercompanyTransferPurposeSchema = z.enum(intercompanyTransferPurposeValues);

export const intercompanyTransferEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  transferNumber: z.string().trim().min(1).max(64),
  fromLegalEntityId: z.string().uuid(),
  toLegalEntityId: z.string().uuid(),
  fromInternalBankAccountId: z.string().uuid(),
  toInternalBankAccountId: z.string().uuid(),
  purpose: intercompanyTransferPurposeSchema,
  currencyCode: z.string().trim().length(3),
  transferAmountMinor: z.string(),
  debitLegAmountMinor: z.string(),
  creditLegAmountMinor: z.string(),
  requestedExecutionDate: z.string().date(),
  status: intercompanyTransferStatusSchema,
  makerUserId: z.string().uuid(),
  checkerUserId: z.string().uuid().nullable(),
  approvedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  settledAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IntercompanyTransferEntity = z.infer<
  typeof intercompanyTransferEntitySchema
>;

export const intercompanyTransferValuesSchema = intercompanyTransferEntitySchema.omit({
  createdAt: true,
  updatedAt: true,
});
