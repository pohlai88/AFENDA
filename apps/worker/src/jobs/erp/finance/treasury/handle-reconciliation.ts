import type { Task } from "graphile-worker";

const TREASURY_RECONCILIATION_EVENTS = [
  "TREAS.RECONCILIATION_SESSION_OPENED",
  "TREAS.RECONCILIATION_MATCH_ADDED",
  "TREAS.RECONCILIATION_MATCH_REMOVED",
  "TREAS.RECONCILIATION_SESSION_CLOSED",
] as const;

export const handleTreasuryReconciliationEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (!TREASURY_RECONCILIATION_EVENTS.includes(event.type as (typeof TREASURY_RECONCILIATION_EVENTS)[number])) {
    helpers.logger.warn(
      `handle_treasury_reconciliation_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury reconciliation event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
