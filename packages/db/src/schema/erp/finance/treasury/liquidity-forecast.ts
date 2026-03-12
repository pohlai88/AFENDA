import { index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import {
  LiquidityForecastStatusValues,
  LiquidityForecastBucketGranularityValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";
import { liquidityScenario } from "./liquidity-scenario";
import { cashPositionSnapshot } from "./cash-position-snapshot";

export const liquidityForecastStatusEnum = pgEnum(
  "liquidity_forecast_status",
  LiquidityForecastStatusValues,
);

export const liquidityForecastBucketGranularityEnum = pgEnum(
  "liquidity_forecast_bucket_granularity",
  LiquidityForecastBucketGranularityValues,
);

export const liquidityForecast = pgTable(
  "liquidity_forecast",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    liquidityScenarioId: uuid("liquidity_scenario_id")
      .notNull()
      .references(() => liquidityScenario.id, { onDelete: "restrict" }),
    cashPositionSnapshotId: uuid("cash_position_snapshot_id")
      .notNull()
      .references(() => cashPositionSnapshot.id, { onDelete: "restrict" }),
    forecastDate: text("forecast_date").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    bucketGranularity: liquidityForecastBucketGranularityEnum("bucket_granularity").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull(),
    status: liquidityForecastStatusEnum("status").notNull().default("draft"),
    sourceVersion: text("source_version").notNull(),
    assumptionSetVersion: text("assumption_set_version").notNull(),
    openingLiquidityMinor: text("opening_liquidity_minor").notNull(),
    closingLiquidityMinor: text("closing_liquidity_minor").notNull(),
    totalExpectedInflowsMinor: text("total_expected_inflows_minor").notNull(),
    totalExpectedOutflowsMinor: text("total_expected_outflows_minor").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("liquidity_forecast_org_date_idx").on(t.orgId, t.forecastDate),
    index("liquidity_forecast_org_scenario_idx").on(t.orgId, t.liquidityScenarioId),
    rlsOrg,
  ],
);

export const liquidityForecastBucket = pgTable(
  "liquidity_forecast_bucket",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    liquidityForecastId: uuid("liquidity_forecast_id")
      .notNull()
      .references(() => liquidityForecast.id, { onDelete: "cascade" }),
    bucketIndex: integer("bucket_index").notNull(),
    bucketStartDate: text("bucket_start_date").notNull(),
    bucketEndDate: text("bucket_end_date").notNull(),
    expectedInflowsMinor: text("expected_inflows_minor").notNull(),
    expectedOutflowsMinor: text("expected_outflows_minor").notNull(),
    openingBalanceMinor: text("opening_balance_minor").notNull(),
    closingBalanceMinor: text("closing_balance_minor").notNull(),
    varianceMinor: text("variance_minor"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("liquidity_forecast_bucket_org_forecast_idx").on(t.orgId, t.liquidityForecastId),
    index("liquidity_forecast_bucket_org_start_idx").on(t.orgId, t.bucketStartDate),
    rlsOrg,
  ],
);
