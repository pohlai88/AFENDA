import type { Task } from "graphile-worker";
import { createInboxItem } from "./inbox-fanout.js";

export const handleSubscriptionDeleted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      subscriptionId: string;
      principalId: string;
      entityType: string;
      entityId: string;
    };
  };

  if (event.type !== "COMM.SUBSCRIPTION_DELETED") {
    helpers.logger.warn(
      `handle_subscription_deleted received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `subscription deleted: subscriptionId=${event.payload.subscriptionId} principalId=${event.payload.principalId} ` +
      `entityType=${event.payload.entityType} entityId=${event.payload.entityId} correlationId=${event.correlationId}`,
  );

  if (
    event.payload.entityType !== "task" &&
    event.payload.entityType !== "project" &&
    event.payload.entityType !== "approval_request" &&
    event.payload.entityType !== "document" &&
    event.payload.entityType !== "board_meeting" &&
    event.payload.entityType !== "announcement"
  ) {
    helpers.logger.warn(
      `subscription deleted with unsupported entityType=${event.payload.entityType}`,
    );
    return;
  }

  await createInboxItem(helpers, {
    orgId: event.orgId,
    principalId: event.payload.principalId,
    eventType: event.type,
    entityType: event.payload.entityType,
    entityId: event.payload.entityId,
    title: "Subscription disabled",
    body: `You unfollowed ${event.payload.entityType} ${event.payload.entityId}.`,
  });
};
