/**
 * Database client factory.
 *
 * Provides a shared drizzle-orm client backed by a pg Pool.
 * Consumers should call `createDbClient(url)` once at startup and
 * pass the returned client to all services.
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index.js";

export function createDbClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;

// ═══════════════════════════════════════════════════════════════════════════════
// ADR-0003: Organization-scoped transaction with full context
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context for ADR-0003 compliant RLS policies.
 *
 * All fields are optional to support partial context (e.g., anonymous requests).
 * At minimum, `orgId` should be provided for multi-tenant isolation.
 */
export interface OrgContext {
  /** Organization ID — multi-org isolation key */
  orgId?: string;
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
 * Sets the following PostgreSQL GUCs (LOCAL to the transaction):
 *   - `app.org_id` — organization isolation
 *   - `app.principal_id` — actor identification
 *   - `app.party_role_id` — the active "hat"
 *   - `app.role_type` — for role-specific policies
 *
 * Usage:
 *   const result = await withOrgContext(db, {
 *     orgId: ctx.activeContext?.orgId,
 *     principalId: ctx.principalId,
 *     partyRoleId: ctx.activeContext?.partyRoleId,
 *     roleType: ctx.activeContext?.roleType,
 *   }, async (tx) => {
 *     return tx.query.invoice.findMany({ where: ... });
 *   });
 */
export async function withOrgContext<T>(
  db: DbClient,
  context: OrgContext,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set all context GUCs that are provided
    if (context.orgId) {
      await tx.execute(
        sql`SELECT set_config('app.org_id', ${context.orgId}, true)`,
      );
    }
    if (context.principalId) {
      await tx.execute(
        sql`SELECT set_config('app.principal_id', ${context.principalId}, true)`,
      );
    }
    if (context.partyRoleId) {
      await tx.execute(
        sql`SELECT set_config('app.party_role_id', ${context.partyRoleId}, true)`,
      );
    }
    if (context.roleType) {
      await tx.execute(
        sql`SELECT set_config('app.role_type', ${context.roleType}, true)`,
      );
    }

    return fn(tx as unknown as DbClient);
  });
}

/**
 * Health-check: ping the database and report latest migration hash.
 * Used by /readyz to verify the DB is reachable and migrated.
 */
export async function checkDbHealth(
  db: DbClient,
): Promise<{ ok: boolean; latencyMs: number; migration?: string }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);

    let migration: string | undefined;
    try {
      const result = await db.execute(
        sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (row) migration = String(row["hash"]);
    } catch {
      // Migration table may not exist yet — not fatal
    }

    return { ok: true, latencyMs: Date.now() - start, migration };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
