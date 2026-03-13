import type { Task } from "graphile-worker";

export const handleTaskTimeLogged: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      timeEntryId: string;
      minutes: number;
      entryDate: string;
    };
  };

  if (event.type !== "COMM.TASK_TIME_LOGGED") {
    helpers.logger.warn(`handle_task_time_logged received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task time logged: taskId=${event.payload.taskId} timeEntryId=${event.payload.timeEntryId} ` +
      `minutes=${event.payload.minutes} correlationId=${event.correlationId}`,
  );
};
