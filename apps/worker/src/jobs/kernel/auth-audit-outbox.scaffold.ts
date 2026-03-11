/**
 * Auth audit outbox processing — scaffold for worker job.
 *
 * Contract: pickPendingAuthAuditJobs from @afenda/core.
 * Full implementation would:
 * - Create db via createDb(DATABASE_URL)
 * - Poll pickPendingAuthAuditJobs(db, 100)
 * - For each row: markProcessing → process payload → markProcessed/markFailed
 * - Route by eventType (auth.signin.success, auth.mfa.failure, etc.)
 * - Use FOR UPDATE SKIP LOCKED when adding row-level locking
 *
 * Example usage (when wired to cron or poll loop):
 *
 *   import { createDb, pickPendingAuthAuditJobs } from "@afenda/core";
 *   const { db } = createDb(process.env.DATABASE_URL!);
 *   const rows = await pickPendingAuthAuditJobs(db, 100);
 *   for (const row of rows) {
 *     // markProcessing(row.id) → process row.payload → markProcessed(row.id)
 *   }
 */

export const AUTH_AUDIT_OUTBOX_TASK = "process_auth_audit_outbox" as const;
