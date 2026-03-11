import {
  pgTable,
  text,
  uuid,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organization } from "../identity";
import { tsz, rlsOrg } from "../../_helpers";

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOX (append-only — no updates, no deletes)
// ─────────────────────────────────────────────────────────────────────────────
export const outboxEvent = pgTable(
  "outbox_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    version: text("version").notNull().default("1"),
    correlationId: text("correlation_id").notNull(),
    occurredAt: tsz("occurred_at").defaultNow().notNull(),
    payload: jsonb("payload").notNull(),
    delivered: boolean("delivered").default(false).notNull(),
    deliveredAt: tsz("delivered_at"),
  },
  (t) => [
    index("outbox_undelivered_idx").on(t.delivered, t.occurredAt),
    index("outbox_org_idx").on(t.orgId),
    rlsOrg,
  ],
);
