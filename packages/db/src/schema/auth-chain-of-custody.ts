/**
 * AUTH_CHAIN_OF_CUSTODY — evidence chain-of-custody metadata.
 *
 * Each evidence artifact carries: created_at, exported_at, exported_by,
 * signature, previous_hash for chained integrity. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authChainOfCustody = pgTable(
  "auth_chain_of_custody",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    evidenceType: text("evidence_type").notNull(),
    evidenceId: text("evidence_id").notNull(),
    action: text("action").notNull(),
    actorUserId: text("actor_user_id"),
    actorRole: text("actor_role"),
    timestamp: tsz("timestamp").defaultNow().notNull(),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    evidenceIdx: index("auth_chain_of_custody_evidence_idx").on(
      t.evidenceType,
      t.evidenceId,
    ),
    tsIdx: index("auth_chain_of_custody_timestamp_idx").on(t.timestamp),
  }),
);
