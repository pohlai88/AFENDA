/**
 * Worker job: handle invoice.rejected event.
 *
 * Triggered when an invoice is rejected by an approver.
 * Sprint 1: logs the event. Future: notification dispatch, re-submission flow.
 */
import type { Task } from "graphile-worker";

export const handleInvoiceRejected: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      invoiceId: string;
      rejectedBy: string | null;
      reason: string;
    };
  };

  helpers.logger.info(
    `invoice rejected: invoiceId=${event.payload.invoiceId} ` +
    `rejectedBy=${event.payload.rejectedBy ?? "system"} ` +
    `reason=${event.payload.reason} ` +
    `correlationId=${event.correlationId}`,
  );

  // Future Sprint 2+:
  //   - Send rejection notification to submitter
  //   - Update analytics / dashboard counters
  //   - Enqueue re-submission reminder if applicable
};
