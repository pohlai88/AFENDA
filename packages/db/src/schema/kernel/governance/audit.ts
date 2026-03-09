import { pgTable, text, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../identity.js";
import { tsz, rlsOrg } from "../../_helpers.js";

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
