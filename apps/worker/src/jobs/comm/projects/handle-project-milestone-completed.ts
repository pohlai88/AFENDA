import type { Task } from "graphile-worker";

export const handleProjectMilestoneCompleted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      milestoneId: string;
    };
  };

  if (event.type !== "COMM.PROJECT_MILESTONE_COMPLETED") {
    helpers.logger.warn(
      `handle_project_milestone_completed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `project milestone completed: milestoneId=${event.payload.milestoneId} ` +
      `correlationId=${event.correlationId}`,
  );
};
