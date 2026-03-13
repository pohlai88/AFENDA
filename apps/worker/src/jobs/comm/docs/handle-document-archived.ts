import type { Task } from "graphile-worker";

export const handleDocumentArchived: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: { documentId: string; documentNumber: string; correlationId: string };
  };

  if (event.type !== "COMM.DOCUMENT_ARCHIVED") {
    helpers.logger.warn(`handle_document_archived received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `document archived: documentId=${event.payload.documentId} documentNumber=${event.payload.documentNumber}`,
  );
};
