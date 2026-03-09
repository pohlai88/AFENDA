import type { Task } from "graphile-worker";

const INVOICE_LINE_EVENTS = [
	"AP.INVOICE_LINE_CREATED",
	"AP.INVOICE_LINE_UPDATED",
	"AP.INVOICE_LINE_DELETED",
] as const;

export const handleInvoiceLineEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!INVOICE_LINE_EVENTS.includes(event.type as (typeof INVOICE_LINE_EVENTS)[number])) {
		helpers.logger.warn(
			`handle_invoice_line_event received unexpected event type: ${event.type}`,
		);
		return;
	}

	helpers.logger.info(
		`processed invoice line event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
