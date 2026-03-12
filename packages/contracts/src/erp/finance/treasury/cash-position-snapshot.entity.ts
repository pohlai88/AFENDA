import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const CashPositionSnapshotStatusValues = [
  "draft",
  "calculated",
  "superseded",
] as const;
export const CashPositionSnapshotStatusSchema = z.enum(CashPositionSnapshotStatusValues);

export const CashPositionBucketTypeValues = [
  "book_balance",
  "available_balance",
  "pending_inflow",
  "pending_outflow",
  "projected_available_balance",
] as const;
export const CashPositionBucketTypeSchema = z.enum(CashPositionBucketTypeValues);
export type CashPositionBucketType = z.infer<typeof CashPositionBucketTypeSchema>;

export const CashPositionSourceTypeValues = [
  "bank_statement",
  "payment_instruction",
  "manual_adjustment",
  "ap_projection",
  "ar_projection",
] as const;
export const CashPositionSourceTypeSchema = z.enum(CashPositionSourceTypeValues);
export type CashPositionSourceType = z.infer<typeof CashPositionSourceTypeSchema>;

export const CashPositionSnapshotIdSchema = brandedUuid("CashPositionSnapshotId");
export type CashPositionSnapshotId = z.infer<typeof CashPositionSnapshotIdSchema>;

export const CashPositionSnapshotLineIdSchema = brandedUuid("CashPositionSnapshotLineId");
export type CashPositionSnapshotLineId = z.infer<typeof CashPositionSnapshotLineIdSchema>;

export const CashPositionSnapshotSchema = z.object({
  id: CashPositionSnapshotIdSchema,
  orgId: OrgIdSchema,
  snapshotDate: z.string().date(),
  asOfAt: UtcDateTimeSchema,
  baseCurrencyCode: CurrencyCodeSchema,
  status: CashPositionSnapshotStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  totalBookBalanceMinor: z.string(),
  totalAvailableBalanceMinor: z.string(),
  totalPendingInflowMinor: z.string(),
  totalPendingOutflowMinor: z.string(),
  totalProjectedAvailableMinor: z.string(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
export type CashPositionSnapshot = z.infer<typeof CashPositionSnapshotSchema>;

export const CashPositionSnapshotLineSchema = z.object({
  id: CashPositionSnapshotLineIdSchema,
  orgId: OrgIdSchema,
  snapshotId: CashPositionSnapshotIdSchema,
  bankAccountId: z.string().uuid().nullable(),
  currencyCode: CurrencyCodeSchema,
  nativeCurrencyCode: CurrencyCodeSchema,
  bucketType: CashPositionBucketTypeSchema,
  amountMinor: z.string(),
  nativeAmountMinor: z.string(),
  normalizedAmountMinor: z.string(),
  sourceType: CashPositionSourceTypeSchema,
  sourceId: z.string().uuid().nullable(),
  lineDescription: z.string().trim().max(255).nullable(),
  createdAt: UtcDateTimeSchema,
});
export type CashPositionSnapshotLine = z.infer<typeof CashPositionSnapshotLineSchema>;
