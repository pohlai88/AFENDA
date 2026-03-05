/**
 * Worker job: handle journal.posted event.
 *
 * Triggered when a journal entry is posted to the GL.
 * When the journal has a sourceInvoiceId, transitions the invoice
 * from "approved" → "posted" using a TOCTOU-safe update.
 *
 * Sprint 1: invoice status transition.
 * Future: balance recalculation, notifications.
 */
import type { Task } from "graphile-worker";

export const handleJournalPosted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      journalEntryId: string;
      entryNumber: string;
      sourceInvoiceId: string | null;
      lineCount: number;
    };
  };

  helpers.logger.info(
    `journal posted: entryId=${event.payload.journalEntryId} ` +
      `number=${event.payload.entryNumber} ` +
      `lines=${event.payload.lineCount} ` +
      `sourceInvoice=${event.payload.sourceInvoiceId ?? "none"} ` +
      `correlationId=${event.correlationId}`,
  );

  // ── Transition source invoice approved → posted ─────────────────────────
  if (event.payload.sourceInvoiceId) {
    await helpers.withPgClient(async (pgClient) => {
      // TOCTOU-safe: only update if still in "approved" status
      const result = await pgClient.query(
        `UPDATE invoice
            SET status = 'posted', updated_at = now()
          WHERE id = $1
            AND org_id = $2
            AND status = 'approved'
          RETURNING id`,
        [event.payload.sourceInvoiceId, event.orgId],
      );

      if (result.rowCount === 1) {
        // Append status history row
        await pgClient.query(
          `INSERT INTO invoice_status_history
            (invoice_id, org_id, from_status, to_status, correlation_id, occurred_at)
           VALUES ($1, $2, 'approved', 'posted', $3, now())`,
          [event.payload.sourceInvoiceId, event.orgId, event.correlationId],
        );

        helpers.logger.info(
          `invoice ${event.payload.sourceInvoiceId} transitioned approved → posted ` +
            `(journal ${event.payload.entryNumber})`,
        );
      } else {
        helpers.logger.warn(
          `invoice ${event.payload.sourceInvoiceId} not transitioned — ` +
            `current status is not 'approved' (may have already been processed)`,
        );
      }
    });
  }

  // Future Sprint 2+:
  //   - Trigger trial balance recalculation / cache invalidation
  //   - Send posting confirmation notification
};
