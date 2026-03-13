import type { Task } from "graphile-worker";

export const handleMinutesRecorded: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      minuteId: string;
      meetingId: string;
      resolutionId: string | null;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.MINUTES_RECORDED") {
    helpers.logger.warn(
      `handle_minutes_recorded received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `minutes recorded: minuteId=${event.payload.minuteId} meetingId=${event.payload.meetingId}`,
  );
};
