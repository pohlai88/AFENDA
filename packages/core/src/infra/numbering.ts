/**
 * Numbering service — gap-free human-readable document IDs.
 *
 * Each organization has per-entity-type, per-period sequences stored in the
 * `sequence` table.  `nextNumber()` atomically increments `next_value` and
 * returns a formatted string like "INV-2026-0042".
 *
 * ⚠️  Gap-free constraint: this function MUST be called inside the **same DB
 * transaction** as the domain mutation (INSERT/UPDATE) that uses the number.
 * If the surrounding transaction rolls back, the consumed number is returned
 * to the pool (by virtue of the rollback), preserving gap-freedom.
 *
 * The `UPDATE … RETURNING` takes a row lock, so concurrent calls on the same
 * (org, entityType, periodKey) serialise naturally — even under Read Committed.
 * Serializable isolation is NOT required for gap-freedom, but it may be used
 * globally for other invariants.
 *
 * **Policy: strict gap-free.**  Numbers are assigned only at final commit
 * (posting/issuing).  Cancelled documents keep their number and are marked
 * VOID — the number is never reused.
 */

import type { DbClient } from "@afenda/db";
import { sequence } from "@afenda/db";
import { eq, and, sql } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import type { SequenceEntityType } from "@afenda/contracts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NextNumberOptions {
  /** Period key for year-partitioned sequences (default: current year). */
  periodKey?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Atomically consume the next sequence value for an org + entity type + period.
 *
 * All arithmetic stays in SQL to avoid BigInt / numeric type mismatches
 * between the Postgres driver and JS.
 *
 * @param db - A transaction client (NOT the root pool client).
 * @returns Formatted string, e.g. "INV-2026-0042"
 * @throws If no sequence row is configured for the given combination.
 */
export async function nextNumber(
  db: DbClient,
  orgId: OrgId,
  entityType: SequenceEntityType,
  options?: NextNumberOptions,
): Promise<string> {
  const periodKey = options?.periodKey ?? String(new Date().getFullYear()); // gate:allow-js-date — year string for default period key

  // Atomically increment and return the consumed value + formatting config.
  // `consumed` = pre-increment value (the number we're issuing).
  // All arithmetic in SQL — no JS BigInt edge cases.
  const rows = await db
    .update(sequence)
    .set({
      nextValue: sql`${sequence.nextValue} + 1`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(sequence.orgId, orgId),
        eq(sequence.entityType, entityType),
        eq(sequence.periodKey, periodKey),
      ),
    )
    .returning({
      prefix: sequence.prefix,
      consumed: sql<string>`(${sequence.nextValue} - 1)::text`,
      padWidth: sequence.padWidth,
    });

  const row = rows[0];
  if (!row) {
    throw new Error(
      `No sequence configured for org=${orgId} entityType=${entityType} periodKey=${periodKey}`,
    );
  }

  const padded = row.consumed.padStart(row.padWidth, "0");
  return `${row.prefix}-${padded}`;
}

/**
 * Ensure a sequence row exists for an org + entity type + period.
 *
 * Idempotent — does nothing if the row already exists.
 * Useful during org onboarding or at the start of a new fiscal year.
 */
export async function ensureSequence(
  db: DbClient,
  params: {
    orgId: OrgId;
    entityType: SequenceEntityType;
    periodKey: string;
    prefix: string;
    padWidth?: number;
    startValue?: number;
  },
): Promise<void> {
  await db
    .insert(sequence)
    .values({
      orgId: params.orgId,
      entityType: params.entityType,
      periodKey: params.periodKey,
      prefix: params.prefix,
      padWidth: params.padWidth ?? 4,
      nextValue: params.startValue ?? 1,
    })
    .onConflictDoNothing();
}
