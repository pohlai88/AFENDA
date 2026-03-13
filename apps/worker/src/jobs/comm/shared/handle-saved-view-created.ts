import type { Task } from "graphile-worker";

export const handleSavedViewCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      savedViewId: string;
      entityType: string;
      principalId: string | null;
    };
  };

  if (event.type !== "COMM.SAVED_VIEW_CREATED") {
    helpers.logger.warn(`handle_saved_view_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `saved view created: savedViewId=${event.payload.savedViewId} entityType=${event.payload.entityType} ` +
      `principalId=${event.payload.principalId ?? "org"} correlationId=${event.correlationId}`,
  );
};
