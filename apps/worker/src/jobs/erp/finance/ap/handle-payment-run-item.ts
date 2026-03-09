import type { Task } from "graphile-worker";

const PAYMENT_RUN_ITEM_EVENTS = ["AP.PAYMENT_RUN_ITEM_ADDED"] as const;

export const handlePaymentRunItemEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!PAYMENT_RUN_ITEM_EVENTS.includes(event.type as (typeof PAYMENT_RUN_ITEM_EVENTS)[number])) {
		helpers.logger.warn(
			`handle_payment_run_item_event received unexpected event type: ${event.type}`,
		);
		return;
	}

	helpers.logger.info(
		`processed payment run item event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
