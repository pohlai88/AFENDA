import { pgTable, text, uuid, bigint, jsonb, index } from "drizzle-orm/pg-core";
import { organization } from "../identity.js";
import { tsz } from "../../_helpers.js";

// ─────────────────────────────────────────────────────────────────────────────
// DEAD LETTER (failed worker jobs after N retries)
// ─────────────────────────────────────────────────────────────────────────────
export const deadLetterJob = pgTable(
  "dead_letter_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organization.id, { onDelete: "cascade" }), // nullable: some jobs are global
    taskName: text("task_name").notNull(),
    payload: jsonb("payload").notNull(),
    lastError: text("last_error"),
    attempts: bigint("attempts", { mode: "number" }).notNull(),
    failedAt: tsz("failed_at").defaultNow().notNull(),
  },
  (t) => [index("dead_letter_org_idx").on(t.orgId)],
);
