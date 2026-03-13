import type { Task } from "graphile-worker";

export const handleCommentCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      commentId: string;
      entityType: string;
      entityId: string;
      authorPrincipalId: string;
    };
  };

  if (event.type !== "COMM.COMMENT_CREATED") {
    helpers.logger.warn(`handle_comment_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `comment created: commentId=${event.payload.commentId} entityType=${event.payload.entityType} ` +
      `entityId=${event.payload.entityId} authorPrincipalId=${event.payload.authorPrincipalId} ` +
      `correlationId=${event.correlationId}`,
  );
};
