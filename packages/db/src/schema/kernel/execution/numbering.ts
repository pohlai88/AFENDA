import {
  pgTable,
  text,
  uuid,
  bigint,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { organization } from "../identity.js";
import { tsz, rlsOrg } from "../../_helpers.js";

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE (gap-free human-readable numbers per org + entity type + period)
// ─────────────────────────────────────────────────────────────────────────────
export const sequence = pgTable(
  "sequence",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // SequenceEntityType: "invoice" | "journalEntry" | ...
    periodKey: text("period_key").notNull().default(""), // e.g. "2026", or "" for unpartitioned
    prefix: text("prefix").notNull(), // "INV-2026" | "JE-2026"
    nextValue: bigint("next_value", { mode: "number" }).notNull().default(1),
    padWidth: integer("pad_width").notNull().default(4),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.entityType, t.periodKey] }), rlsOrg],
);
