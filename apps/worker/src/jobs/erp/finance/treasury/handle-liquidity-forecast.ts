import type { Task } from "graphile-worker";

const TREASURY_LIQUIDITY_FORECAST_EVENTS = [
  "TREAS.LIQUIDITY_SCENARIO_CREATED",
  "TREAS.LIQUIDITY_SCENARIO_ACTIVATED",
  "TREAS.LIQUIDITY_FORECAST_CALCULATED",
] as const;

export const handleTreasuryLiquidityForecastEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_LIQUIDITY_FORECAST_EVENTS.includes(
      event.type as (typeof TREASURY_LIQUIDITY_FORECAST_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_liquidity_forecast_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury liquidity forecast event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
