import type { Task } from "graphile-worker";
import { createInboxItems, listSubscriberPrincipalIds } from "../shared/inbox-fanout.js";

export const handleTaskStatusChanged: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      fromStatus: string;
      toStatus: string;
      reason: string | null;
    };
  };

  if (event.type !== "COMM.TASK_STATUS_CHANGED") {
    helpers.logger.warn(`handle_task_status_changed received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task status changed: taskId=${event.payload.taskId} from=${event.payload.fromStatus} ` +
      `to=${event.payload.toStatus} correlationId=${event.correlationId}`,
  );

  const subscriberIds = await listSubscriberPrincipalIds(
    helpers,
    event.orgId,
    "task",
    event.payload.taskId,
  );

  const createdCount = await createInboxItems(
    helpers,
    subscriberIds.map((principalId) => ({
      orgId: event.orgId,
      principalId,
      eventType: event.type,
      entityType: "task" as const,
      entityId: event.payload.taskId,
      title: `Task moved to ${event.payload.toStatus}`,
      body: `Task moved from ${event.payload.fromStatus} to ${event.payload.toStatus}.`,
    })),
  );

  helpers.logger.info(
    `task status inbox fan-out: taskId=${event.payload.taskId} created=${createdCount}`,
  );
};
