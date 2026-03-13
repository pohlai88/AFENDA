import type { Task } from "graphile-worker";
import { createInboxItems, listSubscriberPrincipalIds } from "../shared/inbox-fanout.js";

export const handleTaskAssigned: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      assigneeId: string;
    };
  };

  if (event.type !== "COMM.TASK_ASSIGNED") {
    helpers.logger.warn(`handle_task_assigned received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task assigned: taskId=${event.payload.taskId} assigneeId=${event.payload.assigneeId} ` +
      `correlationId=${event.correlationId}`,
  );

  const subscriberIds = await listSubscriberPrincipalIds(
    helpers,
    event.orgId,
    "task",
    event.payload.taskId,
  );

  const createdCount = await createInboxItems(helpers, [
    {
      orgId: event.orgId,
      principalId: event.payload.assigneeId,
      eventType: event.type,
      entityType: "task",
      entityId: event.payload.taskId,
      title: "Task assigned",
      body: `You were assigned task ${event.payload.taskId}.`,
    },
    ...subscriberIds.map((principalId) => ({
      orgId: event.orgId,
      principalId,
      eventType: event.type,
      entityType: "task" as const,
      entityId: event.payload.taskId,
      title: "Subscribed task assigned",
      body: `A watched task was assigned to ${event.payload.assigneeId}.`,
    })),
  ]);

  helpers.logger.info(
    `task assignment inbox fan-out: taskId=${event.payload.taskId} created=${createdCount}`,
  );
};
