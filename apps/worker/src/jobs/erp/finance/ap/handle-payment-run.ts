import type { Task } from "graphile-worker";

const PAYMENT_RUN_EVENTS = [
  "AP.PAYMENT_RUN_CREATED",
  "AP.PAYMENT_RUN_APPROVED",
  "AP.PAYMENT_RUN_EXECUTED",
] as const;

export const handlePaymentRunEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!PAYMENT_RUN_EVENTS.includes(event.type as (typeof PAYMENT_RUN_EVENTS)[number])) {
		helpers.logger.warn(`handle_payment_run_event received unexpected event type: ${event.type}`);
		return;
	}

	helpers.logger.info(
		`processed payment run event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
