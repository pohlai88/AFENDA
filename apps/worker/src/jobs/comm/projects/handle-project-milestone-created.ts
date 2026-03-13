import type { Task } from "graphile-worker";

export const handleProjectMilestoneCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      projectId: string;
      milestoneId: string;
      milestoneNumber: string;
      name: string;
    };
  };

  if (event.type !== "COMM.PROJECT_MILESTONE_CREATED") {
    helpers.logger.warn(
      `handle_project_milestone_created received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `project milestone created: projectId=${event.payload.projectId} ` +
      `milestoneId=${event.payload.milestoneId} ` +
      `milestoneNumber=${event.payload.milestoneNumber} ` +
      `correlationId=${event.correlationId}`,
  );
};
