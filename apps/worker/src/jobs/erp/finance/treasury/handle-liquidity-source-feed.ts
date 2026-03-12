import type { Task } from "graphile-worker";

const TREASURY_LIQUIDITY_SOURCE_FEED_EVENTS = [
  "TREAS.LIQUIDITY_SOURCE_FEED_UPSERTED",
] as const;

export const handleTreasuryLiquiditySourceFeedEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_LIQUIDITY_SOURCE_FEED_EVENTS.includes(
      event.type as (typeof TREASURY_LIQUIDITY_SOURCE_FEED_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_liquidity_source_feed_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury liquidity source feed event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
