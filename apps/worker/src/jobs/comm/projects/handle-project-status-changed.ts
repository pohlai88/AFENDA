import type { Task } from "graphile-worker";
import { createInboxItems, listSubscriberPrincipalIds } from "../shared/inbox-fanout.js";

export const handleProjectStatusChanged: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      projectId: string;
      fromStatus: string;
      toStatus: string;
      reason: string | null;
    };
  };

  if (event.type !== "COMM.PROJECT_STATUS_CHANGED") {
    helpers.logger.warn(
      `handle_project_status_changed received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `project status changed: projectId=${event.payload.projectId} ` +
      `from=${event.payload.fromStatus} to=${event.payload.toStatus} ` +
      `correlationId=${event.correlationId}`,
  );

  const subscriberIds = await listSubscriberPrincipalIds(
    helpers,
    event.orgId,
    "project",
    event.payload.projectId,
  );

  const createdCount = await createInboxItems(
    helpers,
    subscriberIds.map((principalId) => ({
      orgId: event.orgId,
      principalId,
      eventType: event.type,
      entityType: "project" as const,
      entityId: event.payload.projectId,
      title: `Project moved to ${event.payload.toStatus}`,
      body: `Project moved from ${event.payload.fromStatus} to ${event.payload.toStatus}.`,
    })),
  );

  helpers.logger.info(
    `project status inbox fan-out: projectId=${event.payload.projectId} created=${createdCount}`,
  );
};
