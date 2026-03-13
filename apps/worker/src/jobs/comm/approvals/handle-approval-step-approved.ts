import type { Task } from "graphile-worker";
import { createInboxItems, listApprovalStepAssignees } from "../shared/inbox-fanout.js";

export const handleApprovalStepApproved: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      approvalRequestId: string;
      stepId: string;
      stepIndex: number;
      nextStepIndex: number;
    };
  };

  if (event.type !== "COMM.APPROVAL_STEP_APPROVED") {
    helpers.logger.warn(
      `handle_approval_step_approved received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `approval step approved: approvalRequestId=${event.payload.approvalRequestId} ` +
      `stepId=${event.payload.stepId} stepIndex=${event.payload.stepIndex} ` +
      `nextStepIndex=${event.payload.nextStepIndex} correlationId=${event.correlationId}`,
  );

  const assigneeIds = await listApprovalStepAssignees(
    helpers,
    event.orgId,
    event.payload.approvalRequestId,
    event.payload.nextStepIndex,
  );

  const createdCount = await createInboxItems(
    helpers,
    assigneeIds.map((principalId) => ({
      orgId: event.orgId,
      principalId,
      eventType: event.type,
      entityType: "approval_request" as const,
      entityId: event.payload.approvalRequestId,
      title: "Approval step awaiting your action",
      body: `Step ${event.payload.nextStepIndex + 1} is now pending your review.`,
    })),
  );

  helpers.logger.info(
    `approval step inbox fan-out: approvalRequestId=${event.payload.approvalRequestId} created=${createdCount}`,
  );
};
