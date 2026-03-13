import type { Task } from "graphile-worker";

export const handleWorkflowRunFailed: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      runId: string;
      workflowId: string;
      error: string;
    };
  };

  if (event.type !== "COMM.WORKFLOW_RUN_FAILED") {
    helpers.logger.warn(`handle_workflow_run_failed received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `workflow run failed: runId=${event.payload.runId} workflowId=${event.payload.workflowId} error=${event.payload.error} correlationId=${event.correlationId}`,
  );
};
