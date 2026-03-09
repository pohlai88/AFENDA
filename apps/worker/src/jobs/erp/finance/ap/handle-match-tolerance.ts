import type { Task } from "graphile-worker";

const MATCH_TOLERANCE_EVENTS = [
	"AP.MATCH_TOLERANCE_CREATED",
	"AP.MATCH_TOLERANCE_UPDATED",
	"AP.MATCH_TOLERANCE_DEACTIVATED",
] as const;

export const handleMatchToleranceEvent: Task = async (payload, helpers) => {
	const event = payload as {
		type: string;
		orgId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	};

	if (!MATCH_TOLERANCE_EVENTS.includes(event.type as (typeof MATCH_TOLERANCE_EVENTS)[number])) {
		helpers.logger.warn(
			`handle_match_tolerance_event received unexpected event type: ${event.type}`,
		);
		return;
	}

	helpers.logger.info(
		`processed match tolerance event: type=${event.type} orgId=${event.orgId} correlationId=${event.correlationId}`,
	);
};
