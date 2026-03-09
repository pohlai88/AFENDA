import type { Task } from "graphile-worker";

const HOLD_EVENTS = ["AP.HOLD_CREATED", "AP.HOLD_RELEASED"] as const;

export const handleHoldEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!HOLD_EVENTS.includes(event.type as (typeof HOLD_EVENTS)[number])) {
		helpers.logger.warn(`handle_hold_event received unexpected event type: ${event.type}`);
		return;
	}

	helpers.logger.info(
		`processed hold event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
