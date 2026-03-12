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
  nettingObligationStatusValues,
  nettingSessionStatusValues,
  nettingSourceTypeValues,
} from "@afenda/contracts";

export const nettingSessionStatusEnum = pgEnum(
  "treasury_netting_session_status",
  nettingSessionStatusValues,
);

export const nettingObligationStatusEnum = pgEnum(
  "treasury_netting_obligation_status",
  nettingObligationStatusValues,
);

export const nettingSourceTypeEnum = pgEnum(
  "treasury_netting_source_type",
  nettingSourceTypeValues,
);

export const treasuryNettingSessionTable = pgTable(
  "treasury_netting_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    sessionNumber: text("session_number").notNull(),
    currencyCode: text("currency_code").notNull(),
    nettingDate: date("netting_date").notNull(),
    settlementDate: date("settlement_date").notNull(),
    status: nettingSessionStatusEnum("status").notNull().default("draft"),
    totalObligationCount: integer("total_obligation_count").notNull().default(0),
    totalGrossPayableMinor: text("total_gross_payable_minor").notNull().default("0"),
    totalGrossReceivableMinor: text("total_gross_receivable_minor").notNull().default("0"),
    totalNettableMinor: text("total_nettable_minor").notNull().default("0"),
    sourceVersion: text("source_version").notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_netting_session__org_idx").on(table.orgId),
    orgStatusIdx: index("treasury_netting_session__org_status_idx").on(table.orgId, table.status),
    orgSessionNumberUq: uniqueIndex("treasury_netting_session__org_session_number_uq").on(
      table.orgId,
      table.sessionNumber,
    ),
  }),
);

export const treasuryNettingSessionItemTable = pgTable(
  "treasury_netting_session_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    nettingSessionId: uuid("netting_session_id").notNull(),
    sourceType: nettingSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    fromLegalEntityId: uuid("from_legal_entity_id").notNull(),
    toLegalEntityId: uuid("to_legal_entity_id").notNull(),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    status: nettingObligationStatusEnum("status").notNull().default("included"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgSessionIdx: index("treasury_netting_session_item__org_session_idx").on(
      table.orgId,
      table.nettingSessionId,
    ),
    orgSourceIdx: index("treasury_netting_session_item__org_source_idx").on(
      table.orgId,
      table.sourceId,
    ),
    orgSessionSourceUq: uniqueIndex("treasury_netting_session_item__org_session_source_uq").on(
      table.orgId,
      table.nettingSessionId,
      table.sourceType,
      table.sourceId,
    ),
  }),
);
