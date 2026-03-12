import type { Task } from "graphile-worker";

const TREASURY_NETTING_SESSION_EVENTS = [
  "TREAS.NETTING_SESSION_CREATED",
  "TREAS.NETTING_SESSION_ITEMS_ADDED",
  "TREAS.NETTING_SESSION_CLOSED",
  "TREAS.NETTING_SESSION_SETTLED",
] as const;

export const handleTreasuryNettingSessionClosedEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      nettingSessionId?: string;
      positions?: Array<{ legalEntityId: string; netPositionMinor: string }>;
    };
  };

  if (
    !TREASURY_NETTING_SESSION_EVENTS.includes(
      event.type as (typeof TREASURY_NETTING_SESSION_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_netting_session_closed_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  const nettingSessionId = event.payload.nettingSessionId ?? "unknown";
  const positionCount = event.payload.positions?.length ?? 0;

  helpers.logger.info(
    `processed treasury netting session closed event: orgId=${event.orgId} nettingSessionId=${nettingSessionId} positions=${positionCount} correlationId=${event.correlationId}`,
  );
};
