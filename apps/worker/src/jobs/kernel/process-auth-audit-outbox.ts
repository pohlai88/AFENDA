import type { Task } from "graphile-worker";
import {
  createDb,
  markAuthAuditJobDead,
  markAuthAuditJobFailed,
  markAuthAuditJobProcessing,
  markAuthAuditJobSent,
  pickPendingAuthAuditJobs,
} from "@afenda/core";
import type { DbClient } from "@afenda/db";

const MAX_ATTEMPTS = 10;
const RETRY_AFTER_SECONDS = 60;
const BATCH_LIMIT = 50;

let _db: DbClient | null = null;

function getDb(): DbClient {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[auth-audit-outbox] DATABASE_URL not set");
  ({ db: _db } = createDb(url));
  return _db;
}

/**
 * Graphile Worker task: drains the auth_audit_outbox table.
 *
 * Scheduled via crontab (every minute). Picks up to BATCH_LIMIT pending
 * auth security events, dispatches them (structured log → future SIEM),
 * and marks each as sent, retryable, or dead-lettered on failure.
 *
 * Safe to run concurrently — claim is guarded by a status CAS update.
 */
export const processAuthAuditOutbox: Task = async (_payload, helpers) => {
  const db = getDb();

  const rows = await pickPendingAuthAuditJobs(db, BATCH_LIMIT);

  if (rows.length === 0) return;

  helpers.logger.info(
    "[auth-audit-outbox] processing pending auth events",
    { count: rows.length },
  );

  for (const row of rows) {
    const claimed = await markAuthAuditJobProcessing(db, row.id);
    if (!claimed) continue; // claimed by another concurrent execution

    try {
      // Structured dispatch — route to SIEM sink here in production.
      helpers.logger.info(
        "[auth-audit] event dispatched",
        { id: row.id, eventType: row.eventType, payload: row.payload },
      );

      await markAuthAuditJobSent(db, row.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "dispatch failed";

      if (row.attemptCount >= MAX_ATTEMPTS) {
        await markAuthAuditJobDead(db, row.id, message);
        helpers.logger.error(
          "[auth-audit-outbox] dead-lettered after max attempts",
          { id: row.id, message },
        );
      } else {
        await markAuthAuditJobFailed(db, row.id, message, RETRY_AFTER_SECONDS);
        helpers.logger.warn(
          "[auth-audit-outbox] retry scheduled",
          { id: row.id, message },
        );
      }
    }
  }
};
