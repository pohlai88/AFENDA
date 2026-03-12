import type { Task } from "graphile-worker";

const TREASURY_PAYMENT_EVENTS = [
  "TREAS.PAYMENT_INSTRUCTION_CREATED",
  "TREAS.PAYMENT_INSTRUCTION_SUBMITTED",
  "TREAS.PAYMENT_INSTRUCTION_APPROVED",
  "TREAS.PAYMENT_INSTRUCTION_REJECTED",
  "TREAS.PAYMENT_BATCH_CREATED",
  "TREAS.PAYMENT_BATCH_RELEASE_REQUESTED",
  "TREAS.PAYMENT_BATCH_RELEASED",
] as const;

export const handleTreasuryPaymentEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (!TREASURY_PAYMENT_EVENTS.includes(event.type as (typeof TREASURY_PAYMENT_EVENTS)[number])) {
    helpers.logger.warn(
      `handle_treasury_payment_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury payment event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
