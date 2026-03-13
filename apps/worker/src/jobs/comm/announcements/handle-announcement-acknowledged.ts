import type { Task } from "graphile-worker";

export const handleAnnouncementAcknowledged: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      announcementId: string;
      announcementNumber: string;
      orgId: string;
      principalId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.ANNOUNCEMENT_ACKNOWLEDGED") {
    helpers.logger.warn(
      `handle_announcement_acknowledged received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `announcement acknowledged: announcementId=${event.payload.announcementId} ` +
      `announcementNumber=${event.payload.announcementNumber} ` +
      `principalId=${event.payload.principalId} ` +
      `correlationId=${event.correlationId}`,
  );
};
