import type { Task } from "graphile-worker";

export const handleActionItemUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      actionItemId: string;
      minuteId: string;
      status: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.ACTION_ITEM_UPDATED") {
    helpers.logger.warn(
      `handle_action_item_updated received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `action item updated: actionItemId=${event.payload.actionItemId} minuteId=${event.payload.minuteId} status=${event.payload.status}`,
  );
};
