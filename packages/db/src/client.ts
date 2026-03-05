/**
 * Database client factory + ADR-0003 org-scoped transaction helpers.
 *
 * Provides a shared drizzle-orm client backed by a pg Pool with sane
 * production defaults. Consumers call `createDb(url)` once at startup
 * and destructure `{ db, pool }`.
 *
 * Lifecycle:
 *   const { db, pool } = createDb(DATABASE_URL);
 *   // … on SIGTERM / SIGINT …
 *   await pool.end();
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Client factory
// ═══════════════════════════════════════════════════════════════════════════════

/** Concrete Drizzle DB type — used for both top-level client and tx handles. */
export type DbClient = NodePgDatabase<typeof schema>;

export interface CreateDbOptions {
  /** Max pool connections (default: 10) */
  max?: number;
  /** Close idle connections after this many ms (default: 30 000) */
  idleTimeoutMillis?: number;
  /** Abort connection attempt after this many ms (default: 5 000) */
  connectionTimeoutMillis?: number;
}

/**
 * Create a pooled Drizzle client.
 *
 * Returns `{ db, pool }` so callers can `await pool.end()` on shutdown.
 */
export function createDb(
  connectionString: string,
  opts: CreateDbOptions = {},
) {
  const pool = new Pool({
    connectionString,
    max: opts.max ?? 10,
    idleTimeoutMillis: opts.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: opts.connectionTimeoutMillis ?? 5_000,
  });
  const db: DbClient = drizzle(pool, { schema });
  return { db, pool };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADR-0003: Organization-scoped transaction with full context
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context for ADR-0003 compliant RLS policies.
 *
 * `orgId` is **required** — all org-scoped data access must declare the tenant.
 * For truly anonymous/public flows, use a dedicated helper or DB role instead.
 */
export interface OrgContext {
  /** Organization ID — multi-org isolation key (required) */
  orgId: string;
  /** Authenticated principal ID (from Token.sub) */
  principalId?: string;
  /** Active party role ID (the "hat" the principal is wearing) */
  partyRoleId?: string;
  /** Role type (employee, supplier, customer, etc.) */
  roleType?: string;
}

/**
 * Execute a function within a transaction with ADR-0003 RLS context.
 *
 * Sets the following PostgreSQL GUCs in a **single round-trip**
 * (all LOCAL to the transaction via `set_config(..., true)`):
 *   - `app.org_id`        — organization isolation
 *   - `app.principal_id`  — actor identification
 *   - `app.party_role_id` — the active "hat"
 *   - `app.role_type`     — for role-specific policies
 *
 * Missing optional fields are set to `""` so RLS policies can treat
 * empty-string as "no context" without checking for undefined GUCs.
 *
 * Usage:
 *   const result = await withOrgContext(db, {
 *     orgId: ctx.activeContext.orgId,
 *     principalId: ctx.principalId,
 *     partyRoleId: ctx.activeContext?.partyRoleId,
 *     roleType: ctx.activeContext?.roleType,
 *   }, async (tx) => {
 *     return tx.query.invoice.findMany({ where: ... });
 *   });
 *
 * @throws Error if `context.orgId` is falsy at runtime (defence-in-depth).
 */
export async function withOrgContext<T>(
  db: DbClient,
  context: OrgContext,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  if (!context.orgId) {
    throw new Error("Org context missing: orgId is required");
  }

  return db.transaction(async (tx) => {
    // Single round-trip: set all 4 GUCs in one statement
    await tx.execute(sql`
      SELECT
        set_config('app.org_id',        ${context.orgId},            true),
        set_config('app.principal_id',  ${context.principalId ?? ""}, true),
        set_config('app.party_role_id', ${context.partyRoleId ?? ""}, true),
        set_config('app.role_type',     ${context.roleType ?? ""},    true)
    `);

    return fn(tx);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════════════════════════

export interface DbHealthResult {
  ok: boolean;
  latencyMs: number;
  /** Latest migration hash (if drizzle migration table exists) */
  migrationHash?: string;
  /** Latest migration timestamp (if drizzle migration table exists) */
  migratedAt?: number;
}

/**
 * Health-check: ping the database and report latest migration info.
 * Used by /readyz to verify the DB is reachable and migrated.
 */
export async function checkDbHealth(db: DbClient): Promise<DbHealthResult> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);

    let migrationHash: string | undefined;
    let migratedAt: number | undefined;
    try {
      const result = await db.execute(
        sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
      );
      const row = result.rows[0] as
        | Record<string, unknown>
        | undefined;
      if (row) {
        migrationHash = String(row["hash"]);
        migratedAt = Number(row["created_at"]);
      }
    } catch {
      // Migration table may not exist yet — not fatal
    }

    return { ok: true, latencyMs: Date.now() - start, migrationHash, migratedAt };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
