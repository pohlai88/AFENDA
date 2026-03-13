import type { Task } from "graphile-worker";

export const handleLabelUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      labelId: string;
      name: string;
      color: string;
    };
  };

  if (event.type !== "COMM.LABEL_UPDATED") {
    helpers.logger.warn(`handle_label_updated received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `label updated: labelId=${event.payload.labelId} name=${event.payload.name} correlationId=${event.correlationId}`,
  );
};
