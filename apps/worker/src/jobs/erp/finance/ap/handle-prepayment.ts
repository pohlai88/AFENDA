import type { Task } from "graphile-worker";

const PREPAYMENT_EVENTS = [
  "AP.PREPAYMENT_CREATED",
  "AP.PREPAYMENT_APPLIED",
  "AP.PREPAYMENT_VOIDED",
] as const;

export const handlePrepaymentEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!PREPAYMENT_EVENTS.includes(event.type as (typeof PREPAYMENT_EVENTS)[number])) {
		helpers.logger.warn(`handle_prepayment_event received unexpected event type: ${event.type}`);
		return;
	}

	helpers.logger.info(
		`processed prepayment event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
