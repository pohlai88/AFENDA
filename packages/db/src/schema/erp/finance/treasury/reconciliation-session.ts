import { index, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import {
  ReconciliationSessionStatusValues,
  ReconciliationTargetTypeValues,
  ReconciliationMatchStatusValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";
import { bankAccount } from "./bank-account";
import { bankStatement } from "./bank-statement";

export const reconciliationSessionStatusEnum = pgEnum(
  "reconciliation_session_status",
  ReconciliationSessionStatusValues,
);
export const reconciliationTargetTypeEnum = pgEnum(
  "reconciliation_target_type",
  ReconciliationTargetTypeValues,
);

export const treasuryReconciliationSession = pgTable(
  "treasury_reconciliation_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id")
      .notNull()
      .references(() => bankAccount.id, { onDelete: "restrict" }),
    bankStatementId: uuid("bank_statement_id")
      .notNull()
      .references(() => bankStatement.id, { onDelete: "restrict" }),
    status: reconciliationSessionStatusEnum("status").notNull().default("open"),
    /** Allowed tolerance in minor units, stored as text (bigint-safe) */
    toleranceMinor: text("tolerance_minor").notNull().default("0"),
    closedAt: tsz("closed_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("treasury_recon_session_stmt_uidx").on(t.bankStatementId),
    index("treasury_recon_session_org_status_idx").on(t.orgId, t.status),
    index("treasury_recon_session_org_account_idx").on(t.orgId, t.bankAccountId),
    rlsOrg,
  ],
);

export const reconciliationMatchStatusEnum = pgEnum(
  "reconciliation_match_status",
  ReconciliationMatchStatusValues,
);

export const treasuryReconciliationMatch = pgTable(
  "treasury_reconciliation_match",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    reconciliationSessionId: uuid("reconciliation_session_id")
      .notNull()
      .references(() => treasuryReconciliationSession.id, { onDelete: "cascade" }),
    statementLineId: uuid("statement_line_id").notNull(),
    targetType: reconciliationTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    /** Amount matched in minor units, stored as text */
    matchedAmountMinor: text("matched_amount_minor").notNull(),
    status: reconciliationMatchStatusEnum("match_status").notNull().default("matched"),
    matchedAt: tsz("matched_at").defaultNow().notNull(),
    unmatchedAt: tsz("unmatched_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("treasury_recon_match_org_session_idx").on(t.orgId, t.reconciliationSessionId),
    index("treasury_recon_match_org_line_idx").on(t.orgId, t.statementLineId),
    index("treasury_recon_match_org_target_idx").on(t.orgId, t.targetId),
    index("treasury_recon_match_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);
