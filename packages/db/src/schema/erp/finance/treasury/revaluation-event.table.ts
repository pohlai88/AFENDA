import { index, pgTable, text, uuid, date } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import { tsz, rlsOrg } from "../../../_helpers";
import { treasuryFxExposureTable } from "./fx-exposure.table";
import { fxRateSnapshot } from "./fx-rate-snapshot";
import { treasuryHedgeDesignationTable } from "./hedge-designation.table";

export const revaluationEvent = pgTable(
  "revaluation_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fxExposureId: uuid("fx_exposure_id")
      .notNull()
      .references(() => treasuryFxExposureTable.id, { onDelete: "cascade" }),
    hedgeDesignationId: uuid("hedge_designation_id").references(
      () => treasuryHedgeDesignationTable.id,
      {
        onDelete: "set null",
      },
    ),
    valuationDate: date("valuation_date").notNull(),
    priorRateSnapshotId: uuid("prior_rate_snapshot_id").references(() => fxRateSnapshot.id, {
      onDelete: "set null",
    }),
    currentRateSnapshotId: uuid("current_rate_snapshot_id")
      .notNull()
      .references(() => fxRateSnapshot.id, { onDelete: "restrict" }),
    carryingAmountMinor: text("carrying_amount_minor").notNull(),
    revaluedAmountMinor: text("revalued_amount_minor").notNull(),
    revaluationDeltaMinor: text("revaluation_delta_minor").notNull(),
    status: text("status").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("revaluation_event_org_idx").on(t.orgId),
    index("revaluation_event_org_exposure_idx").on(t.orgId, t.fxExposureId),
    index("revaluation_event_org_date_idx").on(t.orgId, t.valuationDate),
    rlsOrg,
  ],
);
