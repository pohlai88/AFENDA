import type { Task } from "graphile-worker";

export const handleInboxItemRead: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      itemId: string;
      principalId: string;
    };
  };

  if (event.type !== "COMM.INBOX_ITEM_READ") {
    helpers.logger.warn(`handle_inbox_item_read received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `inbox item read: itemId=${event.payload.itemId} principalId=${event.payload.principalId} ` +
      `correlationId=${event.correlationId}`,
  );
};
