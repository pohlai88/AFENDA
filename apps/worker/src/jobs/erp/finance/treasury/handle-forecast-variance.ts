import type { Task } from "graphile-worker";

const TREASURY_FORECAST_VARIANCE_EVENTS = [
  "TREAS.FORECAST_VARIANCE_RECORDED",
] as const;

export const handleTreasuryForecastVarianceEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (
    !TREASURY_FORECAST_VARIANCE_EVENTS.includes(
      event.type as (typeof TREASURY_FORECAST_VARIANCE_EVENTS)[number],
    )
  ) {
    helpers.logger.warn(
      `handle_treasury_forecast_variance_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury forecast variance event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
