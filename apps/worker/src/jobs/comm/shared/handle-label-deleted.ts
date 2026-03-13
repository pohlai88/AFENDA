import type { Task } from "graphile-worker";

export const handleLabelDeleted: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      labelId: string;
    };
  };

  if (event.type !== "COMM.LABEL_DELETED") {
    helpers.logger.warn(`handle_label_deleted received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `label deleted: labelId=${event.payload.labelId} correlationId=${event.correlationId}`,
  );
};
