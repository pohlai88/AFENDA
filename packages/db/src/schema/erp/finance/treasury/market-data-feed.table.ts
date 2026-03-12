import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryMarketDataFeedTable = pgTable(
  "treasury_market_data_feed",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    providerCode: text("provider_code").notNull(),
    feedType: text("feed_type").notNull(),
    baseCurrencyCode: text("base_currency_code"),
    quoteCurrencyCode: text("quote_currency_code"),
    status: text("status").notNull(),
    freshnessMinutes: integer("freshness_minutes").notNull(),
    lastRefreshRequestedAt: timestamp("last_refresh_requested_at", { withTimezone: true }),
    lastRefreshSucceededAt: timestamp("last_refresh_succeeded_at", { withTimezone: true }),
    lastRefreshFailedAt: timestamp("last_refresh_failed_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_market_data_feed__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_market_data_feed__org_code_uq").on(table.orgId, table.code),
  }),
);

export const treasuryMarketDataObservationTable = pgTable(
  "treasury_market_data_observation",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    marketDataFeedId: uuid("market_data_feed_id").notNull(),
    observationDate: date("observation_date").notNull(),
    valueScaled: text("value_scaled").notNull(),
    scale: integer("scale").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgFeedIdx: index("treasury_market_data_observation__org_feed_idx").on(
      table.orgId,
      table.marketDataFeedId,
    ),
  }),
);
