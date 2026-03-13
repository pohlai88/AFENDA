import type { Task } from "graphile-worker";

export const handleProjectMemberRemoved: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      projectId: string;
      principalId: string;
    };
  };

  if (event.type !== "COMM.PROJECT_MEMBER_REMOVED") {
    helpers.logger.warn(
      `handle_project_member_removed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `project member removed: projectId=${event.payload.projectId} ` +
      `principalId=${event.payload.principalId} correlationId=${event.correlationId}`,
  );
};
