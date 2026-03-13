import type { Task } from "graphile-worker";

export const handleTaskUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
    };
  };

  if (event.type !== "COMM.TASK_UPDATED") {
    helpers.logger.warn(`handle_task_updated received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task updated: taskId=${event.payload.taskId} correlationId=${event.correlationId}`,
  );
};
