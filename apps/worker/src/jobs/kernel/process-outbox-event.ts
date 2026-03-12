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
    case "TREAS.BANK_ACCOUNT_CREATED":
    case "TREAS.BANK_ACCOUNT_UPDATED":
    case "TREAS.BANK_ACCOUNT_ACTIVATED":
    case "TREAS.BANK_ACCOUNT_DEACTIVATED":
      await helpers.addJob("handle_treasury_bank_account_event", payload);
      break;
    case "TREAS.BANK_STATEMENT_INGESTED":
    case "TREAS.BANK_STATEMENT_FAILED":
      await helpers.addJob("handle_treasury_bank_statement_event", payload);
      break;
    case "TREAS.RECONCILIATION_SESSION_OPENED":
    case "TREAS.RECONCILIATION_MATCH_ADDED":
    case "TREAS.RECONCILIATION_MATCH_REMOVED":
    case "TREAS.RECONCILIATION_SESSION_CLOSED":
      await helpers.addJob("handle_treasury_reconciliation_event", payload);
      break;
    case "TREAS.PAYMENT_INSTRUCTION_CREATED":
    case "TREAS.PAYMENT_INSTRUCTION_SUBMITTED":
    case "TREAS.PAYMENT_INSTRUCTION_APPROVED":
    case "TREAS.PAYMENT_INSTRUCTION_REJECTED":
    case "TREAS.PAYMENT_BATCH_CREATED":
    case "TREAS.PAYMENT_BATCH_RELEASE_REQUESTED":
    case "TREAS.PAYMENT_BATCH_RELEASED":
      await helpers.addJob("handle_treasury_payment_event", payload);
      break;
    case "TREAS.CASH_POSITION_SNAPSHOT_REQUESTED":
    case "TREAS.CASH_POSITION_SNAPSHOT_SUPERSEDED":
      await helpers.addJob("handle_treasury_cash_position_event", payload);
      break;
    case "TREAS.LIQUIDITY_SCENARIO_CREATED":
    case "TREAS.LIQUIDITY_SCENARIO_ACTIVATED":
    case "TREAS.LIQUIDITY_FORECAST_CALCULATED":
      await helpers.addJob("handle_treasury_liquidity_forecast_event", payload);
      break;
    case "TREAS.LIQUIDITY_SOURCE_FEED_UPSERTED":
      await helpers.addJob("handle_treasury_liquidity_source_feed_event", payload);
      break;
    case "TREAS.FX_RATE_SNAPSHOT_UPSERTED":
      await helpers.addJob("handle_treasury_fx_rate_snapshot_event", payload);
      break;
    case "TREAS.FORECAST_VARIANCE_RECORDED":
      await helpers.addJob("handle_treasury_forecast_variance_event", payload);
      break;
    case "TREAS.AP_DUE_PAYMENT_PROJECTION_UPSERTED":
      await helpers.addJob("handle_treasury_ap_due_payment_projection_event", payload);
      break;
    case "TREAS.AR_EXPECTED_RECEIPT_PROJECTION_UPSERTED":
      await helpers.addJob("handle_treasury_ar_expected_receipt_projection_event", payload);
      break;
    case "TREAS.INTERNAL_BANK_ACCOUNT_CREATED":
    case "TREAS.INTERNAL_BANK_ACCOUNT_ACTIVATED":
    case "TREAS.INTERNAL_BANK_ACCOUNT_DEACTIVATED":
      await helpers.addJob("handle_treasury_internal_bank_account_event", payload);
      break;
    case "TREAS.INTERCOMPANY_TRANSFER_CREATED":
    case "TREAS.INTERCOMPANY_TRANSFER_SUBMITTED":
    case "TREAS.INTERCOMPANY_TRANSFER_APPROVED":
    case "TREAS.INTERCOMPANY_TRANSFER_REJECTED":
      await helpers.addJob("handle_treasury_intercompany_transfer_event", payload);
      break;
    case "TREAS.INTERCOMPANY_TRANSFER_SETTLED":
      await helpers.addJob("handle_treasury_intercompany_transfer_settled_event", payload);
      break;
    case "TREAS.NETTING_SESSION_CREATED":
    case "TREAS.NETTING_SESSION_ITEMS_ADDED":
    case "TREAS.NETTING_SESSION_CLOSED":
    case "TREAS.NETTING_SESSION_SETTLED":
      await helpers.addJob("handle_treasury_netting_session_closed_event", payload);
      break;
    case "TREAS.INTERNAL_INTEREST_RATE_CREATED":
    case "TREAS.INTERNAL_INTEREST_RATE_ACTIVATED":
      await helpers.addJob("handle_treasury_internal_interest_rate_event", payload);
      break;
    case "TREAS.FX_EXPOSURE_CREATED":
    case "TREAS.FX_EXPOSURE_CLOSED":
    case "TREAS.HEDGE_DESIGNATION_CREATED":
    case "TREAS.HEDGE_DESIGNATION_STATUS_UPDATED":
      await helpers.addJob("handle_treasury_fx_risk_event", payload);
      break;
    case "TREAS.REVALUATION_EVENT_CREATED":
    case "TREAS.REVALUATION_EVENT_STATUS_UPDATED":
      await helpers.addJob("handle_treasury_revaluation_event", payload);
      break;
    // Wave 6.1 — Treasury Policy + Limits
    case "TREAS.POLICY_CREATED":
    case "TREAS.POLICY_ACTIVATED":
    case "TREAS.LIMIT_CREATED":
    case "TREAS.LIMIT_ACTIVATED":
      // Audit + outbox suffice for lifecycle events; no async fan-out needed
      break;
    case "TREAS.LIMIT_BREACHED":
      await helpers.addJob("handle_treasury_limit_breached_event", payload);
      break;
    // Wave 6.2 — Bank Connector Abstraction + Market Data Feed
    case "TREAS.BANK_CONNECTOR_CREATED":
    case "TREAS.BANK_CONNECTOR_ACTIVATED":
      // Lifecycle events — audit + outbox suffice; no async fan-out needed
      break;
    case "TREAS.BANK_CONNECTOR_SYNC_REQUESTED":
      await helpers.addJob("handle_bank_connector_sync_requested", payload);
      break;
    case "TREAS.MARKET_DATA_FEED_CREATED":
    case "TREAS.MARKET_DATA_FEED_ACTIVATED":
      // Lifecycle events — audit + outbox suffice; no async fan-out needed
      break;
    case "TREAS.MARKET_DATA_REFRESH_REQUESTED":
      await helpers.addJob("handle_market_data_refresh_requested", payload);
      break;
    case "TREAS.TREASURY_POSTING_REQUESTED":
      await helpers.addJob("handle_treasury_posting_requested", payload);
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
