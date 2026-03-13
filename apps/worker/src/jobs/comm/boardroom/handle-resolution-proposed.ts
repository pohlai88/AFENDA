import type { Task } from "graphile-worker";

export const handleResolutionProposed: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      resolutionId: string;
      meetingId: string;
      title: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.RESOLUTION_PROPOSED") {
    helpers.logger.warn(
      `handle_resolution_proposed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `resolution proposed: resolutionId=${event.payload.resolutionId} meetingId=${event.payload.meetingId} title=${event.payload.title}`,
  );
};
