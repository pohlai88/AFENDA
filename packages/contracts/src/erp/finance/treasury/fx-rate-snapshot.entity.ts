import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const FxRateSnapshotIdSchema = brandedUuid("FxRateSnapshotId");
export type FxRateSnapshotId = z.infer<typeof FxRateSnapshotIdSchema>;

export const FxRateSnapshotSchema = z.object({
  id: FxRateSnapshotIdSchema,
  orgId: OrgIdSchema,
  rateDate: z.string().date(),
  fromCurrencyCode: CurrencyCodeSchema,
  toCurrencyCode: CurrencyCodeSchema,
  rateScaled: z.string(),
  scale: z.number().int().positive(),
  providerCode: z.string().trim().min(1).max(64),
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: UtcDateTimeSchema,
});

export type FxRateSnapshot = z.infer<typeof FxRateSnapshotSchema>;
