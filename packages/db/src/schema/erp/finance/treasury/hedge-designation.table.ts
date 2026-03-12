import { index, pgTable, text, timestamp, uniqueIndex, uuid, date } from "drizzle-orm/pg-core";

export const treasuryHedgeDesignationTable = pgTable(
  "treasury_hedge_designation",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    hedgeNumber: text("hedge_number").notNull(),
    fxExposureId: uuid("fx_exposure_id").notNull(),
    hedgeInstrumentType: text("hedge_instrument_type").notNull(),
    hedgeRelationshipType: text("hedge_relationship_type").notNull(),
    designatedAmountMinor: text("designated_amount_minor").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: text("status").notNull(),
    designationMemo: text("designation_memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_hedge_designation__org_idx").on(table.orgId),
    orgExposureIdx: index("treasury_hedge_designation__org_exposure_idx").on(
      table.orgId,
      table.fxExposureId,
    ),
    orgHedgeNumberUq: uniqueIndex("treasury_hedge_designation__org_hedge_number_uq").on(
      table.orgId,
      table.hedgeNumber,
    ),
  }),
);
