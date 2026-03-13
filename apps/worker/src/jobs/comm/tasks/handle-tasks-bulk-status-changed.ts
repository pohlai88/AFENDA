import type { Task } from "graphile-worker";

export const handleTasksBulkTransitioned: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskIds: string[];
      toStatus: string;
      reason?: string | null;
    };
  };

  if (event.type !== "COMM.TASKS_BULK_TRANSITIONED") {
    helpers.logger.warn(
      `handle_tasks_bulk_transitioned received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `tasks bulk transitioned: count=${event.payload.taskIds.length} toStatus=${event.payload.toStatus} ` +
      `correlationId=${event.correlationId}`,
  );
};
