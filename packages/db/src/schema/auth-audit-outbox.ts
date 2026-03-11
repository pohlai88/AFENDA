import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Auth audit outbox — Outbox Pattern for auth security events.
 *
 * Purpose:
 * - Persist auth security events
 * - Guarantee delivery to worker / event processor
 * - Preserve immutable audit trail
 * - Allow retry and failure recovery
 *
 * Worker polling: SELECT * FROM auth_audit_outbox
 *   WHERE status = 'pending' AND available_at <= now()
 *   ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED;
 */
export const authAuditOutbox = pgTable(
  "auth_audit_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull().default("auth"),
    aggregateId: text("aggregate_id"),

    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),

    status: text("status").notNull().default("pending"), // pending | processing | sent | failed
    attemptCount: integer("attempt_count").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("auth_audit_outbox_status_idx").on(table.status),
    eventTypeIdx: index("auth_audit_outbox_event_type_idx").on(table.eventType),
    availableIdx: index("auth_audit_outbox_available_at_idx").on(table.availableAt),
  }),
);
