import type { Task } from "graphile-worker";

const TREASURY_CASH_POSITION_EVENTS = [
  "TREAS.CASH_POSITION_SNAPSHOT_REQUESTED",
  "TREAS.CASH_POSITION_SNAPSHOT_SUPERSEDED",
] as const;

export const handleTreasuryCashPositionEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (!TREASURY_CASH_POSITION_EVENTS.includes(event.type as (typeof TREASURY_CASH_POSITION_EVENTS)[number])) {
    helpers.logger.warn(
      `handle_treasury_cash_position_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury cash position event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
