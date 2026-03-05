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
    case "GL.JOURNAL_POSTED":
      await helpers.addJob("handle_journal_posted", payload);
      break;
    case "GL.JOURNAL_REVERSED":
      await helpers.addJob("handle_journal_reversed", payload);
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
