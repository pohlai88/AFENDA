import type { Task } from "graphile-worker";

export const handleWorkflowRunCompleted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      runId: string;
      workflowId: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_RUN_COMPLETED") {
    helpers.logger.warn(
      `handle_workflow_run_completed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `workflow run completed: runId=${event.payload.runId} workflowId=${event.payload.workflowId} correlationId=${event.correlationId}`,
  );
};
