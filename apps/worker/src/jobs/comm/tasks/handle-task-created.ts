import type { Task } from "graphile-worker";

export const handleTaskCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      taskNumber: string;
      title: string;
    };
  };

  if (event.type !== "COMM.TASK_CREATED") {
    helpers.logger.warn(`handle_task_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task created: taskId=${event.payload.taskId} taskNumber=${event.payload.taskNumber} ` +
      `title=${event.payload.title} correlationId=${event.correlationId}`,
  );
};
