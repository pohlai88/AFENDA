/**
 * Auth audit outbox — worker-facing query scaffold.
 *
 * Picks pending rows for processing. Full worker implementation would:
 * - Use FOR UPDATE SKIP LOCKED for concurrent workers
 * - Mark processing → process → mark processed/failed
 * - Route by eventType to audit log writer, SIEM export, etc.
 */

import { and, eq, lte, sql } from "drizzle-orm";
import type { DbClient } from "@afenda/db";
import { authAuditOutbox } from "@afenda/db";

export type AuthAuditOutboxRow = (typeof authAuditOutbox.$inferSelect);

export async function pickPendingAuthAuditJobs(
  db: DbClient,
  limit = 100,
): Promise<AuthAuditOutboxRow[]> {
  return db
    .select()
    .from(authAuditOutbox)
    .where(
      and(
        eq(authAuditOutbox.status, "pending"),
        lte(authAuditOutbox.availableAt, sql`now()`),
      ),
    )
    .limit(limit);
}

/** Claim a pending event for processing (idempotent — returns false if already claimed). */
export async function markAuthAuditJobProcessing(
  db: DbClient,
  id: string,
): Promise<boolean> {
  const rows = await db
    .update(authAuditOutbox)
    .set({
      status: "processing",
      claimedAt: sql`now()`,
      attemptCount: sql`${authAuditOutbox.attemptCount} + 1`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(authAuditOutbox.id, id),
        eq(authAuditOutbox.status, "pending"),
      ),
    )
    .returning({ id: authAuditOutbox.id });

  return rows.length > 0;
}

/** Mark an event as successfully dispatched. */
export async function markAuthAuditJobSent(
  db: DbClient,
  id: string,
): Promise<void> {
  await db
    .update(authAuditOutbox)
    .set({
      status: "sent",
      processedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(authAuditOutbox.id, id));
}

/** Reset a failed event to pending (for retry) with a back-off delay. */
export async function markAuthAuditJobFailed(
  db: DbClient,
  id: string,
  errorMessage: string,
  retryAfterSeconds = 60,
): Promise<void> {
  await db
    .update(authAuditOutbox)
    .set({
      status: "pending",
      availableAt: sql`now() + (${retryAfterSeconds} * interval '1 second')`,
      errorMessage,
      updatedAt: sql`now()`,
    })
    .where(eq(authAuditOutbox.id, id));
}

/** Permanently mark an event as dead-lettered (exceeded max attempts). */
export async function markAuthAuditJobDead(
  db: DbClient,
  id: string,
  errorMessage: string,
): Promise<void> {
  await db
    .update(authAuditOutbox)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: sql`now()`,
    })
    .where(eq(authAuditOutbox.id, id));
}
