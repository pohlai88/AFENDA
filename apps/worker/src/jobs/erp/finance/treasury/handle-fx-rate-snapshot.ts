import type { Task } from "graphile-worker";

const TREASURY_FX_RATE_SNAPSHOT_EVENTS = [
  "TREAS.FX_RATE_SNAPSHOT_UPSERTED",
] as const;

export const handleTreasuryFxRateSnapshotEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_FX_RATE_SNAPSHOT_EVENTS.includes(
      event.type as (typeof TREASURY_FX_RATE_SNAPSHOT_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_fx_rate_snapshot_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury fx rate snapshot event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
