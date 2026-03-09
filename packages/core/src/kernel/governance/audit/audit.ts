/**
 * Audit log service — append-only event ledger.
 *
 * Every state-changing command MUST call `writeAuditLog()` after success,
 * ideally **inside the same DB transaction** as the write so the audit
 * row is atomic with the domain mutation.
 *
 * The audit_log table is INSERT-only — no UPDATEs or DELETEs, ever.
 * This is enforced at the DB level via a trigger (see migration 0002).
 *
 * ID fields use branded types from `@afenda/contracts` so the compiler
 * prevents accidentally swapping (e.g.) a PrincipalId for an OrgId.
 * `details` is typed as `JsonObject` and validated at runtime via
 * `assertJsonSafe()` — no Date, BigInt, Map, NaN, Infinity, or class
 * instances may slip into the audit trail.
 *
 * SECURITY — redaction policy:
 *   Never store access tokens, passwords, full card numbers, raw documents,
 *   or PII beyond what is strictly needed for the audit narrative.
 *   Store references (document ID, evidence ID) + hashes instead.
 *   `redactSensitiveKeys()` performs a **deep** recursive strip of common
 *   dangerous keys as a safety net — callers MUST NOT rely on it alone;
 *   sanitize at the call site first.
 *
 *   `details` is capped at DETAILS_MAX_BYTES (64 KB serialized) — fail
 *   closed with a clear error rather than silently truncating.
 *
 * ORG ISOLATION:
 *   `writeAuditLog` and `withAudit` accept an `OrgScopedContext` rather
 *   than a bare `{ orgId }`, so the org ID is always derived from the
 *   request context — callers cannot substitute an arbitrary org.
 */

import type { DbClient } from "@afenda/db";
import { auditLog } from "@afenda/db";
import type {
  PrincipalId,
  CorrelationId,
  EntityId,
  JsonObject,
  AuditAction,
  AuditEntityType,
  AuditLogId,
  OrgId,
} from "@afenda/contracts";
import { AuditLogIdSchema } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Minimum context shape required to derive the org ID.
 *
 * Accepting a structured context instead of a bare `orgId` makes cross-org
 * audit poisoning structurally impossible at call sites — callers cannot
 * pass an arbitrary string; they must hold a valid request context.
 */
export type OrgScopedContext = { activeContext: { orgId: OrgId } };

/** @deprecated Use `OrgScopedContext`. Kept for one-release migration. */
export interface AuditContext {
  orgId: OrgId;
}

/** Max serialized size of `details` (bytes). Fail closed above this. */
const DETAILS_MAX_BYTES = 64_000;

/**
 * Audit entry input.
 */
export interface AuditEntryInput {
  /** The authenticated actor who triggered the action. Null for system events. */
  actorPrincipalId?: PrincipalId | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: EntityId;
  correlationId: CorrelationId;
  /**
   * Stable, caller-assigned idempotency key for this specific command.
   * Pair with a DB unique index on `(org_id, command_id)` to de-duplicate
   * retried writes at the database level.
   */
  commandId?: string;
  /** Must be JSON-safe: no Date, BigInt, Map, NaN, Infinity, or class instances. */
  details?: JsonObject;
}

// ── Runtime JSON-safety guard ─────────────────────────────────────────────────

/**
 * Walk a value tree and throw on anything that won't survive a JSON round-trip.
 * Called before every INSERT so non-serializable data never reaches the DB.
 *
 * Rejects: BigInt, undefined, Function, Symbol, Date, Map, Set,
 *          NaN, ±Infinity (JSON.stringify silently coerces these to null).
 */
function assertJsonSafe(value: unknown, path = "$"): void {
  if (value === null) return;

  const t = typeof value;

  if (t === "string" || t === "boolean") return;

  if (t === "number") {
    if (!Number.isFinite(value as number))
      throw new Error(`Audit details contains non-finite number at ${path}`);
    return;
  }

  if (t === "bigint") throw new Error(`Audit details contains BigInt at ${path}`);
  if (t === "undefined") throw new Error(`Audit details contains undefined at ${path}`);
  if (t === "function" || t === "symbol") throw new Error(`Audit details contains ${t} at ${path}`);

  if (value instanceof Date) throw new Error(`Audit details contains Date at ${path}`);
  if (value instanceof Map || value instanceof Set)
    throw new Error(`Audit details contains Map/Set at ${path}`);

  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJsonSafe(v, `${path}[${i}]`));
    return;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) assertJsonSafe(v, `${path}.${k}`);
    return;
  }

  throw new Error(`Audit details contains unsupported type ${t} at ${path}`);
}

// ── Redaction safety net ──────────────────────────────────────────────────────

/**
 * Keys that should never appear in audit details — case-insensitive, exact match
 * after lowercasing. Covers both camelCase variants (stripped) and snake_case.
 */
const REDACTED_KEYS = new Set([
  "password",
  "pass",
  "token",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "creditcard",
  "cardnumber",
  "cvv",
  "ssn",
]);

/**
 * Recursively strip keys that commonly carry secrets/PII.
 *
 * Deep traversal ensures nested objects like `{ auth: { token: "..." } }` are
 * also redacted. Arrays are walked element-by-element.
 *
 * This is a safety net — callers MUST sanitize at the call site first.
 */
function redactDeep(value: unknown): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t !== "object") return value;
  if (Array.isArray(value)) return value.map(redactDeep);

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redactDeep(v);
  }
  return out;
}

function redactSensitiveKeys(details?: JsonObject): JsonObject | undefined {
  if (!details) return details;
  return redactDeep(details) as JsonObject;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Cast the Drizzle transaction handle to `DbClient`.
 *
 * Drizzle's transaction callback receives a handle whose type is a
 * structural subtype of `DbClient` but carries extra generic params that
 * prevent direct assignment. The cast is intentional and safe — both
 * shapes expose the same query surface. Centralised here so the
 * `unknown` escape-hatch never leaks into business logic.
 */
function asTx(tx: Parameters<Parameters<DbClient["transaction"]>[0]>[0]): DbClient {
  return tx as unknown as DbClient;
}

// ── Core service ──────────────────────────────────────────────────────────────

/**
 * Append a single audit log row.
 *
 * The org ID is derived from `ctx.activeContext.orgId` — callers cannot
 * substitute an arbitrary org, which makes cross-org audit poisoning
 * structurally impossible at call sites.
 *
 * Should be called inside the same DB transaction as the domain write
 * so the audit row is atomic with the mutation. `db` accepts both the
 * root `DbClient` and a Drizzle transaction handle (see `withAudit`).
 *
 * `details` is capped at {@link DETAILS_MAX_BYTES} bytes — fail closed.
 *
 * @returns Branded `AuditLogId`.
 */
export async function writeAuditLog(
  db: DbClient,
  ctx: OrgScopedContext,
  entry: AuditEntryInput,
): Promise<AuditLogId> {
  // Validate the raw details FIRST (before redaction) so Date, Map, NaN, etc.
  // are caught — redactDeep would silently flatten them into empty objects.
  if (entry.details) assertJsonSafe(entry.details);

  const sanitized = redactSensitiveKeys(entry.details);
  if (sanitized) {
    const bytes = Buffer.byteLength(JSON.stringify(sanitized), "utf8");
    if (bytes > DETAILS_MAX_BYTES)
      throw new Error(
        `Audit details too large: ${bytes} bytes (max ${DETAILS_MAX_BYTES}). ` +
          "Store a reference or hash instead.",
      );
  }

  const [row] = await db
    .insert(auditLog)
    .values({
      orgId: ctx.activeContext.orgId,
      actorPrincipalId: entry.actorPrincipalId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      correlationId: entry.correlationId,
      details: sanitized ?? null,
    })
    .returning({ id: auditLog.id });

  if (!row) throw new Error("Failed to write audit log entry");
  return AuditLogIdSchema.parse(row.id);
}

/**
 * Execute a domain operation and write its audit log in the same transaction.
 *
 * The domain callback receives the transaction handle typed as `DbClient`
 * so it can be passed directly to other services without extra casts.
 *
 * Usage:
 * ```ts
 * const result = await withAudit(db, ctx, auditEntry, async (tx) => {
 *   return await registerDocument(tx, params);
 * });
 * ```
 */
export async function withAudit<T>(
  db: DbClient,
  ctx: OrgScopedContext,
  entry: AuditEntryInput,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const txClient = asTx(tx);
    const result = await fn(txClient);
    await writeAuditLog(txClient, ctx, entry);
    return result;
  });
}
