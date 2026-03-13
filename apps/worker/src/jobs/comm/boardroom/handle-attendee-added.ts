import type { Task } from "graphile-worker";

export const handleAttendeeAdded: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      attendeeId: string;
      meetingId: string;
      principalId: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.ATTENDEE_ADDED") {
    helpers.logger.warn(
      `handle_attendee_added received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `attendee added: attendeeId=${event.payload.attendeeId} meetingId=${event.payload.meetingId} principalId=${event.payload.principalId}`,
  );
};
