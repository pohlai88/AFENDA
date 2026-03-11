/**
 * AUTH_INCIDENTS — security/auth incident tracking.
 *
 * Records login anomalies, lockouts, suspicious activity, etc.
 * Platform-wide (no org_id) — incidents may span tenants.
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authIncidents = pgTable(
  "auth_incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("open"),

    relatedUserId: text("related_user_id"),
    relatedEmail: text("related_email"),
    relatedTenantId: text("related_tenant_id"),
    relatedPortal: text("related_portal"),

    acknowledgedBy: text("acknowledged_by"),
    acknowledgedAt: tsz("acknowledged_at"),

    assignedTo: text("assigned_to"),
    assignedAt: tsz("assigned_at"),

    resolvedBy: text("resolved_by"),
    resolvedAt: tsz("resolved_at"),
    resolutionNote: text("resolution_note"),

    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("auth_incidents_status_idx").on(t.status),
    severityIdx: index("auth_incidents_severity_idx").on(t.severity),
    codeIdx: index("auth_incidents_code_idx").on(t.code),
    userIdx: index("auth_incidents_related_user_idx").on(t.relatedUserId),
    tenantIdx: index("auth_incidents_related_tenant_idx").on(t.relatedTenantId),
  }),
);
