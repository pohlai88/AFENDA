import type { Task } from "graphile-worker";

const TREASURY_AR_EXPECTED_RECEIPT_PROJECTION_EVENTS = [
  "TREAS.AR_EXPECTED_RECEIPT_PROJECTION_UPSERTED",
] as const;

export const handleTreasuryArExpectedReceiptProjectionEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_AR_EXPECTED_RECEIPT_PROJECTION_EVENTS.includes(
      event.type as (typeof TREASURY_AR_EXPECTED_RECEIPT_PROJECTION_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_ar_expected_receipt_projection_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury ar expected receipt projection event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
