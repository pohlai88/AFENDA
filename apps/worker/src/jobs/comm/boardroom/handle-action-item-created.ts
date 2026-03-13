import type { Task } from "graphile-worker";

export const handleActionItemCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      actionItemId: string;
      minuteId: string;
      meetingId: string;
      title: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.ACTION_ITEM_CREATED") {
    helpers.logger.warn(
      `handle_action_item_created received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `action item created: actionItemId=${event.payload.actionItemId} minuteId=${event.payload.minuteId} title=${event.payload.title}`,
  );
};
