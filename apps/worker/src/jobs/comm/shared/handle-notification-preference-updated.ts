import type { Task } from "graphile-worker";

export const handleNotificationPreferenceUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    correlationId: string;
    payload: {
      preferenceId: string;
      principalId: string;
      eventType: string;
      channel: "in_app" | "email";
      enabled: boolean;
    };
  };

  if (event.type !== "COMM.NOTIFICATION_PREFERENCE_UPDATED") {
    helpers.logger.warn(
      `handle_notification_preference_updated received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `notification preference updated: preferenceId=${event.payload.preferenceId} ` +
      `principalId=${event.payload.principalId} eventType=${event.payload.eventType} ` +
      `channel=${event.payload.channel} enabled=${String(event.payload.enabled)} ` +
      `correlationId=${event.correlationId}`,
  );
};
