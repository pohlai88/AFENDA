import type { Task } from "graphile-worker";
import { createInboxItem } from "../shared/inbox-fanout.js";

export const handleProjectMemberAdded: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      projectId: string;
      principalId: string;
      role: string;
    };
  };

  if (event.type !== "COMM.PROJECT_MEMBER_ADDED") {
    helpers.logger.warn(
      `handle_project_member_added received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `project member added: projectId=${event.payload.projectId} ` +
      `principalId=${event.payload.principalId} role=${event.payload.role} ` +
      `correlationId=${event.correlationId}`,
  );

  await createInboxItem(helpers, {
    orgId: event.orgId,
    principalId: event.payload.principalId,
    eventType: event.type,
    entityType: "project",
    entityId: event.payload.projectId,
    title: "Added to project",
    body: `You were added to project ${event.payload.projectId} as ${event.payload.role}.`,
  });
};
