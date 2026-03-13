import type { Task } from "graphile-worker";

export const handleTasksBulkAssigned: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskIds: string[];
      assigneeId: string;
    };
  };

  if (event.type !== "COMM.TASKS_BULK_ASSIGNED") {
    helpers.logger.warn(`handle_tasks_bulk_assigned received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `tasks bulk assigned: count=${event.payload.taskIds.length} assigneeId=${event.payload.assigneeId} ` +
      `correlationId=${event.correlationId}`,
  );
};
