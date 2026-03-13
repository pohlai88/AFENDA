import type { Task } from "graphile-worker";

export const handleAnnouncementArchived: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      announcementId: string;
      announcementNumber: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.ANNOUNCEMENT_ARCHIVED") {
    helpers.logger.warn(
      `handle_announcement_archived received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `announcement archived: announcementId=${event.payload.announcementId} ` +
      `announcementNumber=${event.payload.announcementNumber} ` +
      `correlationId=${event.correlationId}`,
  );
};
