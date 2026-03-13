import type { Task } from "graphile-worker";

export const handleTaskChecklistToggled: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      checklistItemId: string;
      checked: boolean;
    };
  };

  if (event.type !== "COMM.TASK_CHECKLIST_TOGGLED") {
    helpers.logger.warn(
      `handle_task_checklist_toggled received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `task checklist toggled: taskId=${event.payload.taskId} checklistItemId=${event.payload.checklistItemId} ` +
      `checked=${event.payload.checked} correlationId=${event.correlationId}`,
  );
};
