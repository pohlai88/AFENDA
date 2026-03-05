/**
 * Idempotency service — duplicate request detection with concurrency safety.
 *
 * Command routes must include an idempotency key so that retries
 * are safe.  The key is scoped per (org, command, key).
 *
 * Flow:
 *   1. preHandler: `beginIdempotency()` attempts to claim the key.
 *        → new:         proceed to handler
 *        → duplicate:   return cached response
 *        → in_progress: reject (another request is executing)
 *        → mismatch:    reject (same key, different payload hash)
 *   2. handler runs only on "new"
 *   3. onSend: `markDoneIdempotency()` stores result within the domain txn
 *
 * Design:
 *   - `beginIdempotency()` inserts a 'pending' row. On conflict it reads the
 *     existing row and returns the appropriate status.
 *   - `markDoneIdempotency()` transitions pending → done with result and
 *     response metadata. Only succeeds if the requestHash still matches.
 *   - `hashRequest()` uses deterministic key-sorted JSON + SHA-256.
 *   - `cleanupExpiredIdempotency()` deletes rows past their `expires_at`.
 */

import type { DbClient } from "@afenda/db";
import { idempotency } from "@afenda/db";
import { eq, and, lt, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { OrgId, IdempotencyKey } from "@afenda/contracts";

// ── Constants ────────────────────────────────────────────────────────────────

/** Default TTL for idempotency keys (24 hours). */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Extended TTL for finance/payment commands (30 days). */
export const IDEMPOTENCY_TTL_FINANCE_MS = 30 * 24 * 60 * 60 * 1000;

// ── Types ────────────────────────────────────────────────────────────────────

export type IdempotencyStatus = "pending" | "done";

export type IdempotencyBeginResult =
  | { status: "new" }
  | { status: "duplicate"; cachedResult: CachedResponse }
  | { status: "in_progress" }
  | { status: "mismatch" };

export interface CachedResponse {
  body: string | null;
  statusCode: number | null;
  headers: Record<string, string> | null;
}

export interface BeginIdempotencyParams {
  orgId: OrgId;
  command: string;
  key: IdempotencyKey;
  requestHash: string;
  ttlMs?: number;
}

export interface MarkDoneIdempotencyParams {
  orgId: OrgId;
  command: string;
  key: IdempotencyKey;
  requestHash: string;
  resultRef: string;
  responseStatus: number;
  responseHeaders?: Record<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic JSON serialiser — sorted keys, rejects non-JSON types.
 * Throws on BigInt, undefined values, functions, symbols.
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";

  if (typeof value === "bigint") return value.toString();

  if (typeof value === "function" || typeof value === "symbol") {
    throw new TypeError(`Cannot serialise ${typeof value} for idempotency hashing`);
  }

  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return "[" + value.map((v) => stableStringify(v)).join(",") + "]";
  }

  // Date → ISO string (stable)
  if (value instanceof Date) return JSON.stringify(value.toISOString());

  // Map, Set, etc. → reject
  if (value instanceof Map || value instanceof Set) {
    throw new TypeError("Cannot serialise Map/Set for idempotency hashing");
  }

  const keys = Object.keys(value).sort();
  const parts = keys
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]));
  return "{" + parts.join(",") + "}";
}

/** SHA-256 hash of the canonically-serialised request body. */
export function hashRequest(body: unknown): string {
  const canonical = stableStringify(body ?? {});
  return createHash("sha256").update(canonical).digest("hex");
}

// ── Core operations ──────────────────────────────────────────────────────────

/**
 * Claim an idempotency key before running the handler.
 *
 * Inserts a 'pending' row. On conflict, reads the existing row and returns:
 *   - `duplicate`    → done + same hash → replay cached response
 *   - `in_progress`  → pending + same hash → another request is executing
 *   - `mismatch`     → different hash → client bug
 */
export async function beginIdempotency(
  db: DbClient,
  params: BeginIdempotencyParams,
): Promise<IdempotencyBeginResult> {
  const ttl = params.ttlMs ?? IDEMPOTENCY_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl); // gate:allow-js-date — TTL offset from app clock is intentional

  // Attempt insert with ON CONFLICT DO NOTHING.
  // If inserted → we claimed the key; if not → row already exists.
  const inserted = await db
    .insert(idempotency)
    .values({
      orgId: params.orgId,
      command: params.command,
      key: params.key,
      requestHash: params.requestHash,
      status: "pending",
      expiresAt,
    })
    .onConflictDoNothing()
    .returning({ orgId: idempotency.orgId });

  if (inserted.length > 0) {
    return { status: "new" };
  }

  // Row already exists — fetch it and decide.
  const rows = await db
    .select()
    .from(idempotency)
    .where(
      and(
        eq(idempotency.orgId, params.orgId),
        eq(idempotency.command, params.command),
        eq(idempotency.key, params.key),
      ),
    )
    .limit(1);

  const existing = rows[0];

  // Row may have been cleaned up between insert attempt and select
  if (!existing) return { status: "new" };

  // Hash mismatch → client reused key with different payload
  if (existing.requestHash !== params.requestHash) {
    return { status: "mismatch" };
  }

  // Same hash, still pending → another request is executing
  if (existing.status === "pending") {
    return { status: "in_progress" };
  }

  // Same hash, done → return cached response
  return {
    status: "duplicate",
    cachedResult: {
      body: existing.resultRef,
      statusCode: existing.responseStatus,
      headers: existing.responseHeaders as Record<string, string> | null,
    },
  };
}

/**
 * Transition an idempotency key from 'pending' → 'done' with result data.
 *
 * Should be called within the same DB transaction as the domain mutation
 * to guarantee atomicity.
 *
 * Returns true if the row was updated, false if hash mismatch or missing.
 */
export async function markDoneIdempotency(
  db: DbClient,
  params: MarkDoneIdempotencyParams,
): Promise<boolean> {
  const updated = await db
    .update(idempotency)
    .set({
      status: "done",
      resultRef: params.resultRef,
      responseStatus: params.responseStatus,
      responseHeaders: params.responseHeaders ?? null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(idempotency.orgId, params.orgId),
        eq(idempotency.command, params.command),
        eq(idempotency.key, params.key),
        eq(idempotency.requestHash, params.requestHash),
        eq(idempotency.status, "pending"),
      ),
    )
    .returning({ orgId: idempotency.orgId });

  return updated.length > 0;
}

/**
 * Release a pending idempotency key (e.g., on handler failure).
 *
 * Deletes the row so the client can safely retry.
 */
export async function releaseIdempotency(
  db: DbClient,
  params: {
    orgId: OrgId;
    command: string;
    key: IdempotencyKey;
    requestHash: string;
  },
): Promise<void> {
  await db
    .delete(idempotency)
    .where(
      and(
        eq(idempotency.orgId, params.orgId),
        eq(idempotency.command, params.command),
        eq(idempotency.key, params.key),
        eq(idempotency.requestHash, params.requestHash),
        eq(idempotency.status, "pending"),
      ),
    );
}

/**
 * Delete expired idempotency rows. Call from a periodic worker/cron.
 *
 * Returns the number of deleted rows.
 */
export async function cleanupExpiredIdempotency(
  db: DbClient,
  now: Date = new Date(), // gate:allow-js-date — comparison threshold, not a stored value
): Promise<number> {
  const deleted = await db
    .delete(idempotency)
    .where(lt(idempotency.expiresAt, now))
    .returning({ orgId: idempotency.orgId });

  return deleted.length;
}
