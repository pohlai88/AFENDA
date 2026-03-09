import type { Task } from "graphile-worker";

const PAYMENT_TERMS_EVENTS = ["AP.PAYMENT_TERMS_CREATED", "AP.PAYMENT_TERMS_UPDATED"] as const;

export const handlePaymentTermsEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!PAYMENT_TERMS_EVENTS.includes(event.type as (typeof PAYMENT_TERMS_EVENTS)[number])) {
		helpers.logger.warn(
			`handle_payment_terms_event received unexpected event type: ${event.type}`,
		);
		return;
	}

	helpers.logger.info(
		`processed payment terms event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
