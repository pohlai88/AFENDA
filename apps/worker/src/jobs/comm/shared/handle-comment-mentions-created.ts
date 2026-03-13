import type { Task } from "graphile-worker";
import { createInboxItems } from "./inbox-fanout.js";

export const handleCommentMentionsCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      commentId: string;
      entityType: string;
      entityId: string;
      authorPrincipalId: string;
      mentionedPrincipalIds: string[];
    };
  };

  if (event.type !== "COMM.COMMENT_MENTIONS_CREATED") {
    helpers.logger.warn(
      `handle_comment_mentions_created received unexpected event type: ${event.type}`,
    );
    return;
  }

  const { commentId, entityType, entityId, authorPrincipalId, mentionedPrincipalIds } =
    event.payload;

  helpers.logger.info(
    `comment mentions: commentId=${commentId} author=${authorPrincipalId} ` +
      `entityType=${entityType} entityId=${entityId} mentioned=${mentionedPrincipalIds.join(",")} ` +
      `correlationId=${event.correlationId}`,
  );

  const inboxEntityType =
    entityType === "task" || entityType === "project" || entityType === "approval_request"
      ? entityType
      : "announcement";

  const createdCount = await createInboxItems(
    helpers,
    mentionedPrincipalIds.map((principalId) => ({
      orgId: event.orgId,
      principalId,
      eventType: event.type,
      entityType: inboxEntityType,
      entityId,
      title: "You were mentioned in a comment",
      body: `Comment ${commentId} mentioned you on ${entityType} ${entityId}.`,
    })),
  );

  helpers.logger.info(
    `comment mention inbox fan-out: commentId=${commentId} created=${createdCount}`,
  );
};
