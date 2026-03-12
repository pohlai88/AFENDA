import { z } from "zod";

export const nettingSessionStatusValues = [
  "draft",
  "open",
  "closed",
  "settled",
  "cancelled",
] as const;

export const nettingObligationStatusValues = ["included", "excluded", "netted", "settled"] as const;

export const nettingSourceTypeValues = ["intercompany_transfer"] as const;

export const nettingSessionStatusSchema = z.enum(nettingSessionStatusValues);
export const nettingObligationStatusSchema = z.enum(nettingObligationStatusValues);
export const nettingSourceTypeSchema = z.enum(nettingSourceTypeValues);

export const nettingParticipantPositionSchema = z.object({
  legalEntityId: z.string().uuid(),
  currencyCode: z.string().trim().length(3),
  grossPayableMinor: z.string(),
  grossReceivableMinor: z.string(),
  netPositionMinor: z.string(),
});

export const nettingSessionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sessionNumber: z.string().trim().min(1).max(64),
  currencyCode: z.string().trim().length(3),
  nettingDate: z.string().date(),
  settlementDate: z.string().date(),
  status: nettingSessionStatusSchema,
  totalObligationCount: z.number().int().nonnegative(),
  totalGrossPayableMinor: z.string(),
  totalGrossReceivableMinor: z.string(),
  totalNettableMinor: z.string(),
  sourceVersion: z.string().trim().min(1).max(128),
  closedAt: z.string().datetime().nullable(),
  settledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const nettingSessionItemEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  nettingSessionId: z.string().uuid(),
  sourceType: nettingSourceTypeSchema,
  sourceId: z.string().uuid(),
  fromLegalEntityId: z.string().uuid(),
  toLegalEntityId: z.string().uuid(),
  currencyCode: z.string().trim().length(3),
  amountMinor: z.string(),
  status: nettingObligationStatusSchema,
  createdAt: z.string().datetime(),
});

export type NettingSessionEntity = z.infer<typeof nettingSessionEntitySchema>;
export type NettingSessionItemEntity = z.infer<typeof nettingSessionItemEntitySchema>;
export type NettingParticipantPosition = z.infer<typeof nettingParticipantPositionSchema>;
