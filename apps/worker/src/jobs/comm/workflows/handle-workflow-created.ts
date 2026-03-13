import type { Task } from "graphile-worker";

export const handleWorkflowCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      workflowId: string;
      name: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_CREATED") {
    helpers.logger.warn(`handle_workflow_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `workflow created: workflowId=${event.payload.workflowId} name=${event.payload.name} correlationId=${event.correlationId}`,
  );
};
