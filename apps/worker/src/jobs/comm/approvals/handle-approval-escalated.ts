import type { Task } from "graphile-worker";

export const handleApprovalEscalated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      approvalRequestId: string;
      approvalNumber: string;
      reason: string;
    };
  };

  if (event.type !== "COMM.APPROVAL_ESCALATED") {
    helpers.logger.warn(`handle_approval_escalated received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `approval escalated: approvalRequestId=${event.payload.approvalRequestId} ` +
      `approvalNumber=${event.payload.approvalNumber} reason=${event.payload.reason} ` +
      `correlationId=${event.correlationId}`,
  );

  // TODO: Notify managers / approvers of escalation
};
