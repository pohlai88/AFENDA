import type { Task } from "graphile-worker";

export const handleApprovalStepDelegated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      approvalRequestId: string;
      stepId: string;
      delegatedFromId: string;
      delegatedToId: string;
    };
  };

  if (event.type !== "COMM.APPROVAL_STEP_DELEGATED") {
    helpers.logger.warn(
      `handle_approval_step_delegated received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `approval step delegated: approvalRequestId=${event.payload.approvalRequestId} ` +
      `stepId=${event.payload.stepId} from=${event.payload.delegatedFromId} ` +
      `to=${event.payload.delegatedToId} correlationId=${event.correlationId}`,
  );

  // TODO: Notify delegate of new approval step assignment
};
