/**
 * AUTH_EVIDENCE_EXPORTS — signed evidence export records.
 *
 * Incident evidence, audit logs, governance snapshots exported with
 * cryptographic signatures for integrity verification. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authEvidenceExports = pgTable(
  "auth_evidence_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    exportType: text("export_type").notNull(),
    framework: text("framework").notNull(),
    status: text("status").notNull(),
    fileName: text("file_name").notNull(),
    fileHash: text("file_hash").notNull(),
    signature: text("signature"),
    signedAt: tsz("signed_at"),
    expiresAt: tsz("expires_at"),
    createdBy: text("created_by").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    frameworkIdx: index("auth_evidence_exports_framework_idx").on(t.framework),
    createdIdx: index("auth_evidence_exports_created_at_idx").on(t.createdAt),
  }),
);
