import type { Task } from "graphile-worker";

/**
 * Processes a single outbox event delivered by Graphile Worker.
 *
 * This handler is the entry point for all async domain events.
 * It must be IDEMPOTENT — safe to call multiple times with the same payload.
 *
 * Routing: dispatch on event `type` to the appropriate domain handler.
 *
 * Sprint 0: proves worker rails. Real domain handlers added in Sprint 1.
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
    `processing outbox event: type=${event.type} correlationId=${event.correlationId} orgId=${event.orgId}`
  );

  // Sprint 0: log-only. Sprint 1+ will route to domain handlers:
  // switch (event.type) {
  //   case "invoice.submitted": await handleInvoiceSubmitted(event, helpers); break;
  //   case "invoice.approved": await handleInvoiceApproved(event, helpers); break;
  //   case "journal.posted": await handleJournalPosted(event, helpers); break;
  //   default: helpers.logger.warn({ eventType: event.type }, "unhandled event type");
  // }

  helpers.logger.info(
    `outbox event processed (sprint 0 stub): type=${event.type} correlationId=${event.correlationId}`
  );
};
