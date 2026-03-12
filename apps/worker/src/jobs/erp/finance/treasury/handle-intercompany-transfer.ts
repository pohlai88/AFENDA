import type { Task } from "graphile-worker";

const TREASURY_INTERCOMPANY_TRANSFER_EVENTS = [
  "TREAS.INTERCOMPANY_TRANSFER_CREATED",
  "TREAS.INTERCOMPANY_TRANSFER_SUBMITTED",
  "TREAS.INTERCOMPANY_TRANSFER_APPROVED",
  "TREAS.INTERCOMPANY_TRANSFER_REJECTED",
] as const;

export const handleTreasuryIntercompanyTransferEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_INTERCOMPANY_TRANSFER_EVENTS.includes(
      event.type as (typeof TREASURY_INTERCOMPANY_TRANSFER_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_intercompany_transfer_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury intercompany transfer event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
