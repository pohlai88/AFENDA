/**
 * Worker job: handle invoice.submitted event.
 *
 * Triggered when a new invoice is submitted.
 * Sprint 1: logs the event. Future: notification dispatch, matching engine trigger.
 */
import type { Task } from "graphile-worker";

export const handleInvoiceSubmitted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      invoiceId: string;
      invoiceNumber: string;
      supplierId: string;
      amountMinor: string;
      currencyCode: string;
    };
  };

  helpers.logger.info(
    `invoice submitted: invoiceId=${event.payload.invoiceId} ` +
      `number=${event.payload.invoiceNumber} ` +
      `amount=${event.payload.amountMinor} ${event.payload.currencyCode} ` +
      `correlationId=${event.correlationId}`,
  );

  // Future Sprint 2+:
  //   - Send notification to approvers
  //   - Trigger three-way matching engine
  //   - Enqueue duplicate-detection check
};
