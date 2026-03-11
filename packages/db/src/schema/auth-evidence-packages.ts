/**
 * AUTH_EVIDENCE_PACKAGES — evidence package bundles for auditors.
 *
 * Assemble incident evidence, audit events, attestations, control runs
 * into a single downloadable bundle. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authEvidencePackages = pgTable(
  "auth_evidence_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    framework: text("framework").notNull(),
    packageType: text("package_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    createdBy: text("created_by").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    sealedAt: tsz("sealed_at"),
    releasedAt: tsz("released_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    frameworkIdx: index("auth_evidence_packages_framework_idx").on(
      t.framework,
    ),
    statusIdx: index("auth_evidence_packages_status_idx").on(t.status),
  }),
);
