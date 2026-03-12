import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CashPositionSnapshotIdSchema, CashPositionSnapshotLineIdSchema } from "./cash-position-snapshot.entity.js";
import { LiquidityForecastIdSchema, LiquidityForecastBucketIdSchema } from "./liquidity-forecast.entity.js";
import { LiquiditySourceFeedIdSchema } from "./liquidity-source-feed.entity.js";

export const CashPositionSnapshotLineageIdSchema = brandedUuid("CashPositionSnapshotLineageId");
export type CashPositionSnapshotLineageId = z.infer<typeof CashPositionSnapshotLineageIdSchema>;

export const LiquidityForecastBucketLineageIdSchema = brandedUuid("LiquidityForecastBucketLineageId");
export type LiquidityForecastBucketLineageId = z.infer<typeof LiquidityForecastBucketLineageIdSchema>;

export const CashPositionSnapshotLineageSchema = z.object({
  id: CashPositionSnapshotLineageIdSchema,
  orgId: OrgIdSchema,
  snapshotId: CashPositionSnapshotIdSchema,
  snapshotLineId: CashPositionSnapshotLineIdSchema,
  liquiditySourceFeedId: LiquiditySourceFeedIdSchema,
  createdAt: UtcDateTimeSchema,
});
export type CashPositionSnapshotLineage = z.infer<typeof CashPositionSnapshotLineageSchema>;

export const LiquidityForecastBucketLineageSchema = z.object({
  id: LiquidityForecastBucketLineageIdSchema,
  orgId: OrgIdSchema,
  liquidityForecastId: LiquidityForecastIdSchema,
  bucketId: LiquidityForecastBucketIdSchema,
  liquiditySourceFeedId: LiquiditySourceFeedIdSchema,
  createdAt: UtcDateTimeSchema,
});
export type LiquidityForecastBucketLineage = z.infer<typeof LiquidityForecastBucketLineageSchema>;
