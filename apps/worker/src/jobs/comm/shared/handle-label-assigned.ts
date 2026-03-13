import type { Task } from "graphile-worker";

export const handleLabelAssigned: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      assignmentId: string;
      labelId: string;
      entityType: string;
      entityId: string;
    };
  };

  if (event.type !== "COMM.LABEL_ASSIGNED") {
    helpers.logger.warn(`handle_label_assigned received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `label assigned: assignmentId=${event.payload.assignmentId} labelId=${event.payload.labelId} entityType=${event.payload.entityType} entityId=${event.payload.entityId} correlationId=${event.correlationId}`,
  );
};
