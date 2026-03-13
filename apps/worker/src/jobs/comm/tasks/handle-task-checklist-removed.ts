import type { Task } from "graphile-worker";

export const handleTaskChecklistRemoved: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      checklistItemId: string;
    };
  };

  if (event.type !== "COMM.TASK_CHECKLIST_REMOVED") {
    helpers.logger.warn(
      `handle_task_checklist_removed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `task checklist removed: taskId=${event.payload.taskId} checklistItemId=${event.payload.checklistItemId} ` +
      `correlationId=${event.correlationId}`,
  );
};
