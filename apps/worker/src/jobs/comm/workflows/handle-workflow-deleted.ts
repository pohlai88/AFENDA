import type { Task } from "graphile-worker";

export const handleWorkflowDeleted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      workflowId: string;
      name: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_DELETED") {
    helpers.logger.warn(`handle_workflow_deleted received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `workflow deleted: workflowId=${event.payload.workflowId} name=${event.payload.name} correlationId=${event.correlationId}`,
  );
};
