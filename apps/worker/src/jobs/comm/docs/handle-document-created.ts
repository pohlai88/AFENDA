import type { Task } from "graphile-worker";

export const handleDocumentCreated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: { documentId: string; documentNumber: string; correlationId: string };
  };

  if (event.type !== "COMM.DOCUMENT_CREATED") {
    helpers.logger.warn(`handle_document_created received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `document created: documentId=${event.payload.documentId} documentNumber=${event.payload.documentNumber}`,
  );
};
