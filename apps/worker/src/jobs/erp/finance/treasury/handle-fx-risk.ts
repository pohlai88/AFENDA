import type { Task } from "graphile-worker";

const TREASURY_FX_RISK_EVENTS = [
  "TREAS.FX_EXPOSURE_CREATED",
  "TREAS.FX_EXPOSURE_CLOSED",
  "TREAS.HEDGE_DESIGNATION_CREATED",
  "TREAS.HEDGE_DESIGNATION_STATUS_UPDATED",
] as const;

export const handleTreasuryFxRiskEvent: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: Record<string, unknown>;
  };

  if (!TREASURY_FX_RISK_EVENTS.includes(event.type as (typeof TREASURY_FX_RISK_EVENTS)[number])) {
    helpers.logger.warn(
      `handle_treasury_fx_risk_event received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `processed treasury fx risk event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
  );
};
