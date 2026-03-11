import {
  pgTable,
  text,
  uuid,
  bigint,
  jsonb,
  index,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "../identity";
import { tsz, rlsOrg } from "../../_helpers";

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────
export const idempotency = pgTable(
  "idempotency",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    command: text("command").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'done'
    resultRef: text("result_ref"),
    responseStatus: bigint("response_status", { mode: "number" }),
    responseHeaders: jsonb("response_headers"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
    expiresAt: tsz("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.orgId, t.command, t.key] }),
    check("idempotency_status_check", sql`${t.status} IN ('pending','done')`),
    index("idempotency_expires_at_idx").on(t.expiresAt),
    rlsOrg,
  ],
);
