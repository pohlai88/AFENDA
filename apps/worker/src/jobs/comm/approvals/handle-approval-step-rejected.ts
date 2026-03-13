import type { Task } from "graphile-worker";
import { createInboxItem, getApprovalRequester } from "../shared/inbox-fanout.js";

export const handleApprovalStepRejected: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      approvalRequestId: string;
      approvalNumber: string;
      sourceEntityType: string;
      sourceEntityId: string;
      rejectionComment: string;
    };
  };

  if (event.type !== "COMM.APPROVAL_STEP_REJECTED") {
    helpers.logger.warn(
      `handle_approval_step_rejected received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `approval rejected: approvalRequestId=${event.payload.approvalRequestId} ` +
      `approvalNumber=${event.payload.approvalNumber} correlationId=${event.correlationId}`,
  );

  const requesterId = await getApprovalRequester(
    helpers,
    event.orgId,
    event.payload.approvalRequestId,
  );
  if (!requesterId) return;

  await createInboxItem(helpers, {
    orgId: event.orgId,
    principalId: requesterId,
    eventType: event.type,
    entityType: "approval_request",
    entityId: event.payload.approvalRequestId,
    title: "Approval rejected",
    body: `${event.payload.approvalNumber} was rejected. ${event.payload.rejectionComment}`,
  });
};
