import type { Task } from "graphile-worker";

const TREASURY_INTERNAL_INTEREST_RATE_EVENTS = [
  "TREAS.INTERNAL_INTEREST_RATE_CREATED",
  "TREAS.INTERNAL_INTEREST_RATE_ACTIVATED",
] as const;

export const handleTreasuryInternalInterestRateEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_INTERNAL_INTEREST_RATE_EVENTS.includes(
      event.type as (typeof TREASURY_INTERNAL_INTEREST_RATE_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_internal_interest_rate_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury internal interest rate event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
