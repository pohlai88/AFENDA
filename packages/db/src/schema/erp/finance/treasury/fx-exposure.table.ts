import { index, pgTable, text, timestamp, uniqueIndex, uuid, date } from "drizzle-orm/pg-core";

export const treasuryFxExposureTable = pgTable(
  "treasury_fx_exposure",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    exposureNumber: text("exposure_number").notNull(),
    exposureDate: date("exposure_date").notNull(),
    valueDate: date("value_date").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull(),
    quoteCurrencyCode: text("quote_currency_code").notNull(),
    direction: text("direction").notNull(),
    grossAmountMinor: text("gross_amount_minor").notNull(),
    openAmountMinor: text("open_amount_minor").notNull(),
    hedgedAmountMinor: text("hedged_amount_minor").notNull(),
    status: text("status").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_fx_exposure__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_fx_exposure__org_status_idx").on(table.orgId, table.status),
    orgExposureNumberUq: uniqueIndex("treasury_fx_exposure__org_exposure_number_uq").on(
      table.orgId,
      table.exposureNumber,
    ),
  }),
);
