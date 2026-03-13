import type { Task } from "graphile-worker";
import { createInboxItems, listApprovalStepAssignees } from "../shared/inbox-fanout.js";

export const handleApprovalRequested: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      approvalRequestId: string;
      approvalNumber: string;
      title: string;
      sourceEntityType: string;
      sourceEntityId: string;
      totalSteps: number;
    };
  };

  if (event.type !== "COMM.APPROVAL_REQUESTED") {
    helpers.logger.warn(`handle_approval_requested received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `approval requested: approvalRequestId=${event.payload.approvalRequestId} ` +
      `approvalNumber=${event.payload.approvalNumber} title=${event.payload.title} ` +
      `steps=${event.payload.totalSteps} correlationId=${event.correlationId}`,
  );

  const assigneeIds = await listApprovalStepAssignees(
    helpers,
    event.orgId,
    event.payload.approvalRequestId,
    0,
  );

  const createdCount = await createInboxItems(
    helpers,
    assigneeIds.map((principalId) => ({
      orgId: event.orgId,
      principalId,
      eventType: event.type,
      entityType: "approval_request" as const,
      entityId: event.payload.approvalRequestId,
      title: "Approval requested",
      body: `${event.payload.approvalNumber}: ${event.payload.title}`,
    })),
  );

  helpers.logger.info(
    `approval requested inbox fan-out: approvalRequestId=${event.payload.approvalRequestId} created=${createdCount}`,
  );
};
