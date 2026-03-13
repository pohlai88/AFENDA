import type { Task } from "graphile-worker";
import { createInboxItems, listSubscriberPrincipalIds } from "../shared/inbox-fanout.js";

export const handleDocumentPublished: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      documentId: string;
      documentNumber: string;
      title: string;
      orgId: string;
      correlationId: string;
    };
  };

  if (event.type !== "COMM.DOCUMENT_PUBLISHED") {
    helpers.logger.warn(`handle_document_published received unexpected event type: ${event.type}`);
    return;
  }

  const subscriberPrincipalIds = await listSubscriberPrincipalIds(
    helpers,
    event.payload.orgId,
    "document",
    event.payload.documentId,
  );

  if (subscriberPrincipalIds.length === 0) {
    helpers.logger.info(
      `document published fan-out skipped (no subscribers): documentId=${event.payload.documentId}`,
    );
    return;
  }

  const createdCount = await createInboxItems(
    helpers,
    subscriberPrincipalIds.map((principalId) => ({
      orgId: event.payload.orgId,
      principalId,
      eventType: event.type,
      entityType: "document" as const,
      entityId: event.payload.documentId,
      title: "Document published",
      body: `${event.payload.documentNumber}: ${event.payload.title}`,
    })),
  );

  helpers.logger.info(
    `document published inbox fan-out: documentId=${event.payload.documentId} created=${createdCount} subscribers=${subscriberPrincipalIds.length}`,
  );
};
