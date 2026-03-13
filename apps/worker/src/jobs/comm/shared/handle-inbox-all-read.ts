import type { Task } from "graphile-worker";

export const handleInboxAllRead: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      principalId: string;
      count: number;
    };
  };

  if (event.type !== "COMM.INBOX_ALL_READ") {
    helpers.logger.warn(`handle_inbox_all_read received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `inbox all read: principalId=${event.payload.principalId} count=${event.payload.count} ` +
      `correlationId=${event.correlationId}`,
  );
};
