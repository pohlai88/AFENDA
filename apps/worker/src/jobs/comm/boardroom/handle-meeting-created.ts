import type { Task } from "graphile-worker";
import { createInboxItems } from "../shared/inbox-fanout.js";

export const handleMeetingCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      meetingId: string;
      meetingNumber: string;
      title: string;
      orgId: string;
      correlationId: string;
      chairId?: string;
      secretaryId?: string | null;
    };
  };

  if (event.type !== "COMM.MEETING_CREATED") {
    helpers.logger.warn(`handle_meeting_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `meeting created: meetingId=${event.payload.meetingId} meetingNumber=${event.payload.meetingNumber} title=${event.payload.title}`,
  );

  const targetPrincipalIds = Array.from(
    new Set([event.payload.chairId, event.payload.secretaryId].filter(Boolean) as string[]),
  );

  if (targetPrincipalIds.length === 0) {
    helpers.logger.info(
      `meeting created inbox fan-out skipped (no chair/secretary): meetingId=${event.payload.meetingId}`,
    );
    return;
  }

  const createdCount = await createInboxItems(
    helpers,
    targetPrincipalIds.map((principalId) => ({
      orgId: event.payload.orgId,
      principalId,
      eventType: event.type,
      entityType: "board_meeting" as const,
      entityId: event.payload.meetingId,
      title: "Board meeting",
      body: `${event.payload.meetingNumber}: ${event.payload.title}`,
    })),
  );

  helpers.logger.info(
    `meeting created inbox fan-out: meetingId=${event.payload.meetingId} created=${createdCount} targetPrincipals=${targetPrincipalIds.length}`,
  );
};
