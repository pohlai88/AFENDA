import {
  pgTable,
  text,
  uuid,
  bigint,
  integer,
  boolean,
  jsonb,
  index,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization, iamPrincipal } from "./iam.js";
import { tsz, rlsOrg } from "./_helpers.js";

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

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────
export const idempotency = pgTable(
  "idempotency",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    command: text("command").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'done'
    resultRef: text("result_ref"),
    responseStatus: bigint("response_status", { mode: "number" }),
    responseHeaders: jsonb("response_headers"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
    expiresAt: tsz("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.orgId, t.command, t.key] }),
    check("idempotency_status_check", sql`${t.status} IN ('pending','done')`),
    index("idempotency_expires_at_idx").on(t.expiresAt),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG (append-only — no updates, no deletes)
// ─────────────────────────────────────────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorPrincipalId: uuid("actor_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g. "invoice.submitted"
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    correlationId: text("correlation_id").notNull(),
    occurredAt: tsz("occurred_at").defaultNow().notNull(),
    details: jsonb("details"),
  },
  (t) => [
    index("audit_log_org_entity_idx").on(t.orgId, t.entityType, t.entityId),
    index("audit_log_correlation_idx").on(t.correlationId),
    index("audit_log_org_time_idx").on(t.orgId, t.occurredAt),
    index("audit_log_actor_idx").on(t.actorPrincipalId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE (gap-free human-readable numbers per org + entity type + period)
// ─────────────────────────────────────────────────────────────────────────────
export const sequence = pgTable(
  "sequence",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // SequenceEntityType: "invoice" | "journalEntry" | ...
    periodKey: text("period_key").notNull().default(""), // e.g. "2026", or "" for unpartitioned
    prefix: text("prefix").notNull(), // "INV-2026" | "JE-2026"
    nextValue: bigint("next_value", { mode: "number" }).notNull().default(1),
    padWidth: integer("pad_width").notNull().default(4),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.entityType, t.periodKey] }), rlsOrg],
);

// ─────────────────────────────────────────────────────────────────────────────
// DEAD LETTER (failed worker jobs after N retries)
// ─────────────────────────────────────────────────────────────────────────────
export const deadLetterJob = pgTable(
  "dead_letter_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organization.id, { onDelete: "cascade" }), // nullable: some jobs are global
    taskName: text("task_name").notNull(),
    payload: jsonb("payload").notNull(),
    lastError: text("last_error"),
    attempts: bigint("attempts", { mode: "number" }).notNull(),
    failedAt: tsz("failed_at").defaultNow().notNull(),
  },
  (t) => [index("dead_letter_org_idx").on(t.orgId)],
);
