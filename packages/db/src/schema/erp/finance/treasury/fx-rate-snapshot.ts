import { index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { tsz, rlsOrg } from "../../../_helpers";

export const fxRateSnapshot = pgTable(
  "fx_rate_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    rateDate: text("rate_date").notNull(),
    fromCurrencyCode: text("from_currency_code").notNull(),
    toCurrencyCode: text("to_currency_code").notNull(),
    rateScaled: text("rate_scaled").notNull(),
    scale: integer("scale").notNull(),
    providerCode: text("provider_code").notNull(),
    sourceVersion: text("source_version").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("fx_rate_snapshot_org_pair_date_source_uidx").on(
      t.orgId,
      t.rateDate,
      t.fromCurrencyCode,
      t.toCurrencyCode,
      t.sourceVersion,
    ),
    index("fx_rate_snapshot_org_date_idx").on(t.orgId, t.rateDate),
    index("fx_rate_snapshot_org_pair_idx").on(t.orgId, t.fromCurrencyCode, t.toCurrencyCode),
    rlsOrg,
  ],
);
