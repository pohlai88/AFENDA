import type { Task } from "graphile-worker";

const TREASURY_AP_DUE_PAYMENT_PROJECTION_EVENTS = [
  "TREAS.AP_DUE_PAYMENT_PROJECTION_UPSERTED",
] as const;

export const handleTreasuryApDuePaymentProjectionEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_AP_DUE_PAYMENT_PROJECTION_EVENTS.includes(
      event.type as (typeof TREASURY_AP_DUE_PAYMENT_PROJECTION_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_ap_due_payment_projection_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury ap due payment projection event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
