import type { Task } from "graphile-worker";

export const handleProjectUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      projectId: string;
    };
  };

  if (event.type !== "COMM.PROJECT_UPDATED") {
    helpers.logger.warn(`handle_project_updated received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `project updated: projectId=${event.payload.projectId} correlationId=${event.correlationId}`,
  );
};
