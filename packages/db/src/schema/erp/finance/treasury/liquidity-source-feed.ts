import { index, pgEnum, pgTable, text, unique, uuid, real } from "drizzle-orm/pg-core";
import {
  LiquiditySourceDirectionValues,
  LiquiditySourceFeedStatusValues,
  LiquiditySourceFeedTypeValues,
} from "@afenda/contracts";
import { organization } from "../../../kernel/identity";
import { bankAccount } from "./bank-account";
import { tsz, rlsOrg } from "../../../_helpers";

export const liquiditySourceFeedTypeEnum = pgEnum(
  "liquidity_source_feed_type",
  LiquiditySourceFeedTypeValues,
);

export const liquiditySourceFeedStatusEnum = pgEnum(
  "liquidity_source_feed_status",
  LiquiditySourceFeedStatusValues,
);

export const liquiditySourceDirectionEnum = pgEnum(
  "liquidity_source_direction",
  LiquiditySourceDirectionValues,
);

export const liquiditySourceFeed = pgTable(
  "liquidity_source_feed",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourceType: liquiditySourceFeedTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    sourceDocumentNumber: text("source_document_number"),
    bankAccountId: uuid("bank_account_id").references(() => bankAccount.id, { onDelete: "set null" }),
    currencyCode: text("currency_code").notNull(),
    amountMinor: text("amount_minor").notNull(),
    dueDate: text("due_date").notNull(),
    direction: liquiditySourceDirectionEnum("direction").notNull(),
    confidenceScore: real("confidence_score"),
    status: liquiditySourceFeedStatusEnum("status").notNull().default("open"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("liquidity_source_feed_org_source_uidx").on(t.orgId, t.sourceType, t.sourceId),
    index("liquidity_source_feed_org_due_idx").on(t.orgId, t.dueDate),
    index("liquidity_source_feed_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);
