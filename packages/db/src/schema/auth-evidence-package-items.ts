/**
 * AUTH_EVIDENCE_PACKAGE_ITEMS — items within an evidence package.
 *
 * Each item references evidence by type and id, with optional hash.
 * Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authEvidencePackageItems = pgTable(
  "auth_evidence_package_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packageId: text("package_id").notNull(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    hash: text("hash"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => ({
    packageIdx: index("auth_evidence_package_items_package_idx").on(
      t.packageId,
    ),
  }),
);
