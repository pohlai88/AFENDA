import type { Task } from "graphile-worker";

export const handleDocumentUpdated: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    payload: {
      documentId: string;
      documentNumber: string;
      versionNumber: number;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.DOCUMENT_UPDATED") {
    helpers.logger.warn(`handle_document_updated received unexpected event type: ${event.type}`);
    return;
  }

  helpers.logger.info(
    `document updated: documentId=${event.payload.documentId} documentNumber=${event.payload.documentNumber} version=${event.payload.versionNumber}`,
  );
};
