export const COMM_DOCUMENT_CREATED = "COMM.DOCUMENT_CREATED" as const;
export const COMM_DOCUMENT_UPDATED = "COMM.DOCUMENT_UPDATED" as const;
export const COMM_DOCUMENT_PUBLISHED = "COMM.DOCUMENT_PUBLISHED" as const;
export const COMM_DOCUMENT_ARCHIVED = "COMM.DOCUMENT_ARCHIVED" as const;
export const COMM_DOCUMENT_COLLABORATOR_ADDED = "COMM.DOCUMENT_COLLABORATOR_ADDED" as const;
export const COMM_DOCUMENT_COLLABORATOR_REMOVED = "COMM.DOCUMENT_COLLABORATOR_REMOVED" as const;

/**
 * Aggregate of document-domain event types (used for outbox validation).
 * Keep this list append-only.
 */
export const CommDocumentEventTypes = [
  COMM_DOCUMENT_CREATED,
  COMM_DOCUMENT_UPDATED,
  COMM_DOCUMENT_PUBLISHED,
  COMM_DOCUMENT_ARCHIVED,
  COMM_DOCUMENT_COLLABORATOR_ADDED,
  COMM_DOCUMENT_COLLABORATOR_REMOVED,
] as const;

export const DocumentEventTypes = CommDocumentEventTypes;

export const CommDocumentEvents = {
  Created: COMM_DOCUMENT_CREATED,
  Updated: COMM_DOCUMENT_UPDATED,
  Published: COMM_DOCUMENT_PUBLISHED,
  Archived: COMM_DOCUMENT_ARCHIVED,
  CollaboratorAdded: COMM_DOCUMENT_COLLABORATOR_ADDED,
  CollaboratorRemoved: COMM_DOCUMENT_COLLABORATOR_REMOVED,
} as const;

export type CommDocumentEvent = (typeof CommDocumentEvents)[keyof typeof CommDocumentEvents];
