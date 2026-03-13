import type { Task } from "graphile-worker";
import { createInboxItems, listSubscriberPrincipalIds } from "../shared/inbox-fanout.js";

export const handleTaskCompleted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      taskId: string;
      actualMinutes: number | null;
      reason: string | null;
    };
  };

  if (event.type !== "COMM.TASK_COMPLETED") {
    helpers.logger.warn(`handle_task_completed received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `task completed: taskId=${event.payload.taskId} actualMinutes=${event.payload.actualMinutes ?? "n/a"} ` +
      `correlationId=${event.correlationId}`,
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
      title: "Task completed",
      body: `Task ${event.payload.taskId} was completed.`,
    })),
  );

  helpers.logger.info(
    `task completion inbox fan-out: taskId=${event.payload.taskId} created=${createdCount}`,
  );
};
