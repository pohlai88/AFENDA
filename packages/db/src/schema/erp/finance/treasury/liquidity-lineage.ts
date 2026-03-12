import { index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { tsz, rlsOrg } from "../../../_helpers";
import { cashPositionSnapshot, cashPositionSnapshotLine } from "./cash-position-snapshot";
import { liquidityForecast, liquidityForecastBucket } from "./liquidity-forecast";
import { liquiditySourceFeed } from "./liquidity-source-feed";

export const cashPositionSnapshotLineage = pgTable(
  "cash_position_snapshot_lineage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => cashPositionSnapshot.id, { onDelete: "cascade" }),
    snapshotLineId: uuid("snapshot_line_id")
      .notNull()
      .references(() => cashPositionSnapshotLine.id, { onDelete: "cascade" }),
    liquiditySourceFeedId: uuid("liquidity_source_feed_id")
      .notNull()
      .references(() => liquiditySourceFeed.id, { onDelete: "cascade" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("cash_position_snapshot_lineage_line_uidx").on(t.snapshotLineId),
    index("cash_position_snapshot_lineage_org_snapshot_idx").on(t.orgId, t.snapshotId),
    index("cash_position_snapshot_lineage_org_feed_idx").on(t.orgId, t.liquiditySourceFeedId),
    rlsOrg,
  ],
);

export const liquidityForecastBucketLineage = pgTable(
  "liquidity_forecast_bucket_lineage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    liquidityForecastId: uuid("liquidity_forecast_id")
      .notNull()
      .references(() => liquidityForecast.id, { onDelete: "cascade" }),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => liquidityForecastBucket.id, { onDelete: "cascade" }),
    liquiditySourceFeedId: uuid("liquidity_source_feed_id")
      .notNull()
      .references(() => liquiditySourceFeed.id, { onDelete: "cascade" }),
    fxRateSnapshotId: uuid("fx_rate_snapshot_id"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("liquidity_forecast_bucket_lineage_bucket_feed_uidx").on(t.bucketId, t.liquiditySourceFeedId),
    index("liquidity_forecast_bucket_lineage_org_forecast_idx").on(t.orgId, t.liquidityForecastId),
    index("liquidity_forecast_bucket_lineage_org_feed_idx").on(t.orgId, t.liquiditySourceFeedId),
    index("liquidity_forecast_bucket_lineage_fx_idx").on(t.fxRateSnapshotId),
    rlsOrg,
  ],
);
