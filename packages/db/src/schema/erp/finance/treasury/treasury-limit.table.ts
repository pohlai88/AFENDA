import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const treasuryLimitTable = pgTable(
  "treasury_limit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    policyId: uuid("policy_id").notNull(),
    code: text("code").notNull(),
    scopeType: text("scope_type").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    currencyCode: text("currency_code"),
    metric: text("metric").notNull(),
    thresholdMinor: text("threshold_minor").notNull(),
    hardBlock: boolean("hard_block").notNull(),
    status: text("status").notNull().default("draft"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_limit__org_idx").on(table.orgId),
    orgPolicyIdx: index("treasury_limit__org_policy_idx").on(table.orgId, table.policyId),
    orgCodeUq: uniqueIndex("treasury_limit__org_code_uq").on(table.orgId, table.code),
  }),
);

export const treasuryLimitBreachTable = pgTable(
  "treasury_limit_breach",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    treasuryLimitId: uuid("treasury_limit_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    measuredValueMinor: text("measured_value_minor").notNull(),
    thresholdMinor: text("threshold_minor").notNull(),
    hardBlock: boolean("hard_block").notNull(),
    overrideRequested: boolean("override_requested").notNull().default(false),
    overrideApprovedByUserId: uuid("override_approved_by_user_id"),
    overrideReason: text("override_reason"),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_limit_breach__org_idx").on(table.orgId),
    orgLimitIdx: index("treasury_limit_breach__org_limit_idx").on(
      table.orgId,
      table.treasuryLimitId,
    ),
  }),
);
