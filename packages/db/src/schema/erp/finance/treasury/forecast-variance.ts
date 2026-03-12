import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { liquidityForecast, liquidityForecastBucket } from "./liquidity-forecast";
import { tsz, rlsOrg } from "../../../_helpers";

export const forecastVariance = pgTable(
  "forecast_variance",
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
    actualInflowsMinor: text("actual_inflows_minor").notNull(),
    actualOutflowsMinor: text("actual_outflows_minor").notNull(),
    actualClosingBalanceMinor: text("actual_closing_balance_minor").notNull(),
    inflowVarianceMinor: text("inflow_variance_minor").notNull(),
    outflowVarianceMinor: text("outflow_variance_minor").notNull(),
    closingBalanceVarianceMinor: text("closing_balance_variance_minor").notNull(),
    measuredAt: text("measured_at").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("forecast_variance_org_forecast_idx").on(t.orgId, t.liquidityForecastId),
    index("forecast_variance_org_bucket_idx").on(t.orgId, t.bucketId),
    rlsOrg,
  ],
);
