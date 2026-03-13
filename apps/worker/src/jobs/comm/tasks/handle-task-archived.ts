import type { Task } from "graphile-worker";

export const handleTaskArchived: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      reason: string | null;
    };
  };

  if (event.type !== "COMM.TASK_ARCHIVED") {
    helpers.logger.warn(`handle_task_archived received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task archived: taskId=${event.payload.taskId} correlationId=${event.correlationId}`,
  );
};
