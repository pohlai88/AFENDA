import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  CashPositionSnapshotStatusValues,
  CashPositionBucketTypeValues,
  CashPositionSourceTypeValues,
} from "@afenda/contracts";
import { organization } from "../../../kernel/identity";
import { bankAccount } from "./bank-account";
import { tsz, rlsOrg } from "../../../_helpers";

export const cashPositionSnapshotStatusEnum = pgEnum(
  "cash_position_snapshot_status",
  CashPositionSnapshotStatusValues,
);

export const cashPositionBucketTypeEnum = pgEnum(
  "cash_position_bucket_type",
  CashPositionBucketTypeValues,
);

export const cashPositionSourceTypeEnum = pgEnum(
  "cash_position_source_type",
  CashPositionSourceTypeValues,
);

export const cashPositionSnapshot = pgTable(
  "cash_position_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    snapshotDate: text("snapshot_date").notNull(),
    asOfAt: text("as_of_at").notNull(),
    baseCurrencyCode: text("base_currency_code").notNull(),
    status: cashPositionSnapshotStatusEnum("status").notNull().default("draft"),
    sourceVersion: text("source_version").notNull(),
    totalBookBalanceMinor: text("total_book_balance_minor").notNull(),
    totalAvailableBalanceMinor: text("total_available_balance_minor").notNull(),
    totalPendingInflowMinor: text("total_pending_inflow_minor").notNull(),
    totalPendingOutflowMinor: text("total_pending_outflow_minor").notNull(),
    totalProjectedAvailableMinor: text("total_projected_available_minor").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("cash_position_snapshot_org_snapshot_idx").on(t.orgId, t.snapshotDate),
    index("cash_position_snapshot_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);

export const cashPositionSnapshotLine = pgTable(
  "cash_position_snapshot_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => cashPositionSnapshot.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id").references(() => bankAccount.id, { onDelete: "set null" }),
    currencyCode: text("currency_code").notNull(),
    nativeCurrencyCode: text("native_currency_code").notNull(),
    bucketType: cashPositionBucketTypeEnum("bucket_type").notNull(),
    amountMinor: text("amount_minor").notNull(),
    nativeAmountMinor: text("native_amount_minor").notNull(),
    normalizedAmountMinor: text("normalized_amount_minor").notNull(),
    sourceType: cashPositionSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"),
    lineDescription: text("line_description"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("cash_position_snapshot_line_org_snapshot_idx").on(t.orgId, t.snapshotId),
    index("cash_position_snapshot_line_org_account_idx").on(t.orgId, t.bankAccountId),
    rlsOrg,
  ],
);
