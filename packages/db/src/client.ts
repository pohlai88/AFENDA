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
import * as schema from "./schema/index";

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
  /** Abort connection attempt after this many ms (default: 5 000, 10 000 for Neon) */
  connectionTimeoutMillis?: number;
}

/** Neon cold start can take ~300–500ms; use longer timeout to avoid spurious failures. */
const NEON_CONNECTION_TIMEOUT_MS = 10_000;

/** Parse DB_POOL_MAX from env (default 10). */
function getPoolMax(optsMax: number | undefined): number {
  const env = process.env["DB_POOL_MAX"];
  if (!env) return optsMax ?? 10;
  const n = parseInt(env, 10);
  return Number.isNaN(n) || n < 1 ? (optsMax ?? 10) : Math.min(n, 100);
}

/** Parse DB_IDLE_TIMEOUT_MS from env. For Neon scale-to-zero, use 10000 to release connections sooner. */
function getIdleTimeout(optsIdle: number | undefined): number {
  const env = process.env["DB_IDLE_TIMEOUT_MS"];
  if (env) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n >= 1000) return n;
  }
  return optsIdle ?? 30_000;
}

/**
 * Create a pooled Drizzle client.
 *
 * Returns `{ db, pool }` so callers can `await pool.end()` on shutdown.
 * When connecting to Neon (neon.tech), connectionTimeoutMillis defaults to 10s
 * to accommodate cold starts from scale-to-zero.
 *
 * Env overrides: DB_POOL_MAX, DB_IDLE_TIMEOUT_MS
 */
export function createDb(connectionString: string, opts: CreateDbOptions = {}) {
  const isNeon = connectionString.includes("neon.tech");
  const connectionTimeoutMillis =
    opts.connectionTimeoutMillis ?? (isNeon ? NEON_CONNECTION_TIMEOUT_MS : 5_000);
  const max = getPoolMax(opts.max);
  const idleTimeoutMillis = getIdleTimeout(opts.idleTimeoutMillis);

  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  });
  const db: DbClient = drizzle(pool, { schema });
  return { db, pool };
}

/** Options for warmUpDbWithRetry */
export interface WarmUpOptions {
  /** Max retries (default 3) */
  maxRetries?: number;
  /** Initial delay ms before first retry (default 1000) */
  initialDelayMs?: number;
}

/**
 * Warm up the DB connection with retry. Use on API/worker startup when using Neon
 * to handle scale-to-zero cold starts. Runs SELECT 1; retries with exponential backoff.
 */
export async function warmUpDbWithRetry(
  db: DbClient,
  opts: WarmUpOptions = {},
): Promise<void> {
  const maxRetries = opts.maxRetries ?? 3;
  const initialDelayMs = opts.initialDelayMs ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await db.execute(sql`SELECT 1`);
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = initialDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
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
      const row = result.rows[0] as Record<string, unknown> | undefined;
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
