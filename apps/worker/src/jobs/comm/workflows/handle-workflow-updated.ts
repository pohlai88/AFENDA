import type { Task } from "graphile-worker";

export const handleWorkflowUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      workflowId: string;
      name?: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_UPDATED") {
    helpers.logger.warn(`handle_workflow_updated received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `workflow updated: workflowId=${event.payload.workflowId} correlationId=${event.correlationId}`,
  );
};
