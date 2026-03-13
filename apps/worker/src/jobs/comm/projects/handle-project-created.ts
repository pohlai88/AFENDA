import type { Task } from "graphile-worker";

export const handleProjectCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      projectId: string;
      projectNumber: string;
      name: string;
      ownerId: string;
    };
  };

  if (event.type !== "COMM.PROJECT_CREATED") {
    helpers.logger.warn(`handle_project_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `project created: projectId=${event.payload.projectId} ` +
      `projectNumber=${event.payload.projectNumber} name=${event.payload.name} ` +
      `correlationId=${event.correlationId}`,
  );
};
