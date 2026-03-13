import type { Task } from "graphile-worker";

export const handleAgendaItemAdded: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      agendaItemId: string;
      meetingId: string;
      title: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.AGENDA_ITEM_ADDED") {
    helpers.logger.warn(
      `handle_agenda_item_added received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `agenda item added: agendaItemId=${event.payload.agendaItemId} meetingId=${event.payload.meetingId} title=${event.payload.title}`,
  );
};
