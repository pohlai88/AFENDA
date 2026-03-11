/**
 * AUTH_RETENTION_POLICIES — evidence retention policies by jurisdiction.
 *
 * Retention rules per region (GDPR, CCPA, SOX, etc.); automated purge or
 * archive based on policy. Platform-wide (no org_id).
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authRetentionPolicies = pgTable(
  "auth_retention_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jurisdiction: text("jurisdiction").notNull(),
    evidenceType: text("evidence_type").notNull(),
    retentionDays: integer("retention_days").notNull(),
    archivalRequired: text("archival_required").notNull().default("true"),
    legalBasis: text("legal_basis"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    jurisdictionIdx: index("auth_retention_policies_jurisdiction_idx").on(
      t.jurisdiction,
    ),
    evidenceIdx: index("auth_retention_policies_evidence_type_idx").on(
      t.evidenceType,
    ),
  }),
);
