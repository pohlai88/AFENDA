/**
 * Worker job: handle invoice.voided event.
 *
 * Triggered when an invoice is voided (cancelled).
 * Sprint 2: auto-reverses any GL journal entries linked to this invoice.
 */
import type { Task } from "graphile-worker";

export const handleInvoiceVoided: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      invoiceId: string;
      voidedBy: string | null;
      reason: string;
    };
  };

  helpers.logger.info(
    `invoice voided: invoiceId=${event.payload.invoiceId} ` +
    `voidedBy=${event.payload.voidedBy ?? "system"} ` +
    `reason=${event.payload.reason} ` +
    `correlationId=${event.correlationId}`,
  );

  // Auto-reverse GL journal entries linked to this invoice
  await helpers.withPgClient(async (pgClient) => {
    // Find all unreversed journal entries for this invoice
    const { rows: entries } = await pgClient.query<{
      id: string;
      entry_number: string;
    }>(
      `SELECT je.id, je.entry_number
         FROM journal_entry je
        WHERE je.source_invoice_id = $1
          AND je.org_id = (SELECT org_id FROM invoice WHERE id = $1)
          AND je.reversal_of IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM journal_entry rev WHERE rev.reversal_of = je.id
          )`,
      [event.payload.invoiceId],
    );

    if (entries.length === 0) {
      helpers.logger.info(
        `no GL entries to reverse for voided invoice ${event.payload.invoiceId}`,
      );
      return;
    }

    for (const entry of entries) {
      helpers.logger.info(
        `queueing GL reversal for entry=${entry.id} (${entry.entry_number}) ` +
        `due to voided invoice=${event.payload.invoiceId}`,
      );

      // Dispatch GL reversal as a new outbox-style job so it goes through
      // the standard reverse-entry flow with its own audit trail.
      await helpers.addJob("handle_journal_reversed", {
        type: "GL.VOID_AUTO_REVERSAL",
        orgId: event.orgId,
        correlationId: event.correlationId,
        payload: {
          journalEntryId: entry.id,
          entryNumber: entry.entry_number,
          sourceInvoiceId: event.payload.invoiceId,
          reason: `Auto-reversal: invoice ${event.payload.invoiceId} voided — ${event.payload.reason}`,
        },
      });
    }

    helpers.logger.info(
      `queued ${entries.length} GL reversal(s) for voided invoice ${event.payload.invoiceId}`,
    );
  });
};
