/**
 * Shared schema helpers — single source for timestamp, RLS policy, and
 * common column definitions.  Every schema file imports from here;
 * duplications are forbidden (enforced by BARREL_IMPURE gate).
 */
import { pgPolicy, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Timestamp helper: all timestamps are UTC (timestamptz) ──────────────────
// Column name is REQUIRED — enforces snake_case in DB.
export const tsz = (name: string) => timestamp(name, { withTimezone: true });

// ─── RLS policy: org isolation via GUC set by withOrgContext() ────────────────
// Applied to every table that carries org_id.
export const rlsOrg = pgPolicy("org_isolation", {
  as: "permissive",
  for: "all",
  to: "public",
  using: sql`org_id = current_setting('app.org_id', true)::uuid`,
  withCheck: sql`org_id = current_setting('app.org_id', true)::uuid`,
});

// ─── RLS policy: principal-based isolation (membership table) ─────────────────
export const rlsPrincipal = pgPolicy("principal_isolation", {
  as: "permissive",
  for: "all",
  to: "public",
  using: sql`principal_id = current_setting('app.principal_id', true)::uuid`,
  withCheck: sql`principal_id = current_setting('app.principal_id', true)::uuid`,
});

// ─── Common column helpers ───────────────────────────────────────────────────

/** Standard org_id FK column — uuid NOT NULL. Caller must add .references(). */
export const orgIdCol = () => uuid("org_id").notNull();

/** Standard updated_at column — timestamptz, defaults to now(). */
export const updatedAtCol = () => tsz("updated_at").defaultNow().notNull();
