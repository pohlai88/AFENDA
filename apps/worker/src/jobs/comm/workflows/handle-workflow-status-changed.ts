import type { Task } from "graphile-worker";

export const handleWorkflowStatusChanged: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      workflowId: string;
      oldStatus: string;
      newStatus: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_STATUS_CHANGED") {
    helpers.logger.warn(
      `handle_workflow_status_changed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `workflow status changed: workflowId=${event.payload.workflowId} oldStatus=${event.payload.oldStatus} newStatus=${event.payload.newStatus} correlationId=${event.correlationId}`,
  );
};
