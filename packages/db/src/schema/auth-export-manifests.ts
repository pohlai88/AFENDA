/**
 * AUTH_EXPORT_MANIFESTS — immutable export manifests.
 *
 * Export manifests (file list, hashes, signatures) stored append-only;
 * no update or delete once created. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authExportManifests = pgTable(
  "auth_export_manifests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packageId: text("package_id").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    manifestVersion: text("manifest_version").notNull(),
    immutableSnapshotRef: text("immutable_snapshot_ref").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    packageIdx: index("auth_export_manifests_package_idx").on(t.packageId),
  }),
);
