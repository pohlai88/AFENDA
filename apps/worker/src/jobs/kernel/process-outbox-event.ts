import type { Task } from "graphile-worker";

/**
 * Processes a single outbox event delivered by Graphile Worker.
 *
 * This handler is the entry point for all async domain events.
 * It must be IDEMPOTENT — safe to call multiple times with the same payload.
 *
 * Routing: dispatch on event `type` to the appropriate domain handler.
 * Sprint 1: routes AP and GL events to dedicated handlers.
 */
export const processOutboxEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    version: string;
    orgId: string;
    correlationId: string;
    occurredAt: string;
    payload: unknown;
  };

  helpers.logger.info(
    `processing outbox event: type=${event.type} correlationId=${event.correlationId} orgId=${event.orgId}`,
  );

  switch (event.type) {
    case "AP.INVOICE_CREATED":
      // No async side effects for draft creation — audit + outbox suffice
      break;
    case "AP.INVOICE_SUBMITTED":
      await helpers.addJob("handle_invoice_submitted", payload);
      break;
    case "AP.INVOICE_APPROVED":
      await helpers.addJob("handle_invoice_approved", payload);
      break;
    case "AP.INVOICE_REJECTED":
      await helpers.addJob("handle_invoice_rejected", payload);
      break;
    case "AP.INVOICE_VOIDED":
      await helpers.addJob("handle_invoice_voided", payload);
      break;
    case "AP.INVOICE_PAID":
      await helpers.addJob("handle_invoice_paid", payload);
      break;
    case "AP.HOLD_CREATED":
    case "AP.HOLD_RELEASED":
      await helpers.addJob("handle_hold_event", payload);
      break;
    case "AP.INVOICE_LINE_CREATED":
    case "AP.INVOICE_LINE_UPDATED":
    case "AP.INVOICE_LINE_DELETED":
      await helpers.addJob("handle_invoice_line_event", payload);
      break;
    case "AP.MATCH_TOLERANCE_CREATED":
    case "AP.MATCH_TOLERANCE_UPDATED":
    case "AP.MATCH_TOLERANCE_DEACTIVATED":
      await helpers.addJob("handle_match_tolerance_event", payload);
      break;
    case "AP.PAYMENT_RUN_CREATED":
    case "AP.PAYMENT_RUN_APPROVED":
    case "AP.PAYMENT_RUN_EXECUTED":
      await helpers.addJob("handle_payment_run_event", payload);
      break;
    case "AP.PAYMENT_RUN_ITEM_ADDED":
      await helpers.addJob("handle_payment_run_item_event", payload);
      break;
    case "AP.PAYMENT_TERMS_CREATED":
    case "AP.PAYMENT_TERMS_UPDATED":
      await helpers.addJob("handle_payment_terms_event", payload);
      break;
    case "AP.PREPAYMENT_CREATED":
    case "AP.PREPAYMENT_APPLIED":
    case "AP.PREPAYMENT_VOIDED":
      await helpers.addJob("handle_prepayment_event", payload);
      break;
    case "AP.WHT_CERTIFICATE_CREATED":
    case "AP.WHT_CERTIFICATE_ISSUED":
    case "AP.WHT_CERTIFICATE_SUBMITTED":
      await helpers.addJob("handle_wht_certificate_event", payload);
      break;
    case "GL.JOURNAL_POSTED":
      await helpers.addJob("handle_journal_posted", payload);
      break;
    case "GL.JOURNAL_REVERSED":
      await helpers.addJob("handle_journal_reversed", payload);
      break;
    case "PURCHASING.PURCHASE_ORDER_CREATED":
      // No async side effects for draft PO creation
      break;
    case "PURCHASING.RECEIPT_CREATED":
      // No async side effects for draft receipt creation
      break;
    default:
      helpers.logger.warn(
        `unhandled outbox event type: ${event.type} correlationId=${event.correlationId}`,
      );
  }

  helpers.logger.info(
    `outbox event dispatched: type=${event.type} correlationId=${event.correlationId}`,
  );
};
