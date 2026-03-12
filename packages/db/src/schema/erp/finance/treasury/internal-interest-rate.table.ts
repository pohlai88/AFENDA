import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  internalInterestDayCountValues,
  internalInterestRateStatusValues,
} from "@afenda/contracts";

export const internalInterestRateStatusEnum = pgEnum(
  "treasury_internal_interest_rate_status",
  internalInterestRateStatusValues,
);

export const internalInterestDayCountEnum = pgEnum(
  "treasury_internal_interest_day_count",
  internalInterestDayCountValues,
);

export const treasuryInternalInterestRateTable = pgTable(
  "treasury_internal_interest_rate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    currencyCode: text("currency_code").notNull(),
    annualRateBps: integer("annual_rate_bps").notNull(),
    dayCountConvention: internalInterestDayCountEnum("day_count_convention").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    status: internalInterestRateStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_internal_interest_rate__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_internal_interest_rate__org_code_uq").on(
      table.orgId,
      table.code,
    ),
    orgCurrencyStatusIdx: index("treasury_internal_interest_rate__org_currency_status_idx").on(
      table.orgId,
      table.currencyCode,
      table.status,
    ),
  }),
);
