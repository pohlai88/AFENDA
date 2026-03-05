/**
 * Worker job: handle invoice.paid event.
 *
 * Triggered when an invoice transitions to "paid" status.
 * Sprint 2: logs the event. Future: payment reconciliation, supplier metrics.
 */
import type { Task } from "graphile-worker";

export const handleInvoicePaid: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      invoiceId: string;
      paidBy: string | null;
      paymentReference: string;
    };
  };

  helpers.logger.info(
    `invoice paid: invoiceId=${event.payload.invoiceId} ` +
      `paidBy=${event.payload.paidBy ?? "system"} ` +
      `paymentRef=${event.payload.paymentReference} ` +
      `correlationId=${event.correlationId}`,
  );

  // Future Sprint 3+:
  //   - Reconcile payment against bank feed
  //   - Update supplier payment metrics
  //   - Send payment confirmation notification
};
