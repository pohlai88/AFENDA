/**
 * AUTH_AUDITOR_ACCESS_GRANTS — read-only auditor portal access.
 *
 * Grants for external auditors: evidence packages, attestations,
 * chain-of-custody — no write access. Platform-wide (no org_id).
 */
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authAuditorAccessGrants = pgTable(
  "auth_auditor_access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    auditorUserId: text("auditor_user_id").notNull(),
    framework: text("framework").notNull(),
    packageId: text("package_id"),
    expiresAt: tsz("expires_at"),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => ({
    auditorIdx: index("auth_auditor_access_grants_auditor_idx").on(
      t.auditorUserId,
    ),
    statusIdx: index("auth_auditor_access_grants_status_idx").on(t.status),
  }),
);
