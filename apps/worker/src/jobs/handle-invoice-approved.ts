/**
 * Worker job: handle invoice.approved event.
 *
 * Triggered when an invoice is approved.
 * Sprint 1: logs the event. Future: auto-post to GL, payment scheduling.
 */
import type { Task } from "graphile-worker";

export const handleInvoiceApproved: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      invoiceId: string;
      approvedBy: string | null;
    };
  };

  helpers.logger.info(
    `invoice approved: invoiceId=${event.payload.invoiceId} ` +
    `approvedBy=${event.payload.approvedBy ?? "system"} ` +
    `correlationId=${event.correlationId}`,
  );

  // Future Sprint 2+:
  //   - Auto-post to GL (if org config enables auto-posting)
  //   - Schedule payment based on payment terms
  //   - Send approval notification
};
