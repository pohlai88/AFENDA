/**
 * AUTH_REVIEW_ATTESTATIONS — compliance review attestation records.
 *
 * Control owners attest to effectiveness; audit trail of who attested,
 * when, and for which entity. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authReviewAttestations = pgTable(
  "auth_review_attestations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewType: text("review_type").notNull(),
    framework: text("framework").notNull(),
    relatedEntityType: text("related_entity_type").notNull(),
    relatedEntityId: text("related_entity_id").notNull(),
    attestedBy: text("attested_by").notNull(),
    attestedAt: tsz("attested_at").defaultNow().notNull(),
    statement: text("statement").notNull(),
    outcome: text("outcome").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    frameworkIdx: index("auth_review_attestations_framework_idx").on(
      t.framework,
    ),
    entityIdx: index("auth_review_attestations_entity_idx").on(
      t.relatedEntityType,
      t.relatedEntityId,
    ),
  }),
);
