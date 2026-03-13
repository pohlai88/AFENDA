import type { Task } from "graphile-worker";

export const handleTaskChecklistAdded: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      addedCount: number;
    };
  };

  if (event.type !== "COMM.TASK_CHECKLIST_ADDED") {
    helpers.logger.warn(
      `handle_task_checklist_added received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `task checklist added: taskId=${event.payload.taskId} addedCount=${event.payload.addedCount} ` +
      `correlationId=${event.correlationId}`,
  );
};
