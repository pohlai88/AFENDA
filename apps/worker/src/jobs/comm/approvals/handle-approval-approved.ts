import type { Task } from "graphile-worker";
import { createInboxItem, getApprovalRequester } from "../shared/inbox-fanout.js";

export const handleApprovalApproved: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      approvalRequestId: string;
      approvalNumber: string;
      sourceEntityType: string;
      sourceEntityId: string;
    };
  };

  if (event.type !== "COMM.APPROVAL_APPROVED") {
    helpers.logger.warn(`handle_approval_approved received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `approval fully approved: approvalRequestId=${event.payload.approvalRequestId} ` +
      `approvalNumber=${event.payload.approvalNumber} sourceEntityType=${event.payload.sourceEntityType} ` +
      `sourceEntityId=${event.payload.sourceEntityId} correlationId=${event.correlationId}`,
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
    title: "Approval completed",
    body: `${event.payload.approvalNumber} has been approved.`,
  });
};
