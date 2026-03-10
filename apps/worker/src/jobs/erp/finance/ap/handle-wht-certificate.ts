import type { Task } from "graphile-worker";

const WHT_CERTIFICATE_EVENTS = [
  "AP.WHT_CERTIFICATE_CREATED",
  "AP.WHT_CERTIFICATE_ISSUED",
  "AP.WHT_CERTIFICATE_SUBMITTED",
] as const;

export const handleWhtCertificateEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!WHT_CERTIFICATE_EVENTS.includes(event.type as (typeof WHT_CERTIFICATE_EVENTS)[number])) {
		helpers.logger.warn(
			`handle_wht_certificate_event received unexpected event type: ${event.type}`,
		);
		return;
	}

	helpers.logger.info(
		`processed wht certificate event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
