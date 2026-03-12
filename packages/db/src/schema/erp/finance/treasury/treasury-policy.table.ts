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

export const treasuryPolicyTable = pgTable(
  "treasury_policy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    scopeType: text("scope_type").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    currencyCode: text("currency_code"),
    allowOverride: boolean("allow_override").notNull(),
    status: text("status").notNull().default("draft"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("treasury_policy__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_policy__org_code_uq").on(table.orgId, table.code),
  }),
);
