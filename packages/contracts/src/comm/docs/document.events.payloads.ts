import { z } from "zod";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CollaboratorRoleSchema, CommDocumentIdSchema, CommDocumentTypeSchema, CommDocumentVisibilitySchema } from "./document.entity.js";
import {
  COMM_DOCUMENT_ARCHIVED,
  COMM_DOCUMENT_COLLABORATOR_ADDED,
  COMM_DOCUMENT_COLLABORATOR_REMOVED,
  COMM_DOCUMENT_CREATED,
  COMM_DOCUMENT_PUBLISHED,
  COMM_DOCUMENT_UPDATED,
} from "./document.events.js";

// ─── Created ─────────────────────────────────────────────────────────────────

/** @alias {@link COMM_DOCUMENT_CREATED} */
export const DocumentCreatedEventSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  title: z.string().trim().min(1).max(500),
  documentType: CommDocumentTypeSchema,
  visibility: CommDocumentVisibilitySchema,
  createdByPrincipalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommDocumentCreatedEventType = COMM_DOCUMENT_CREATED;
export type DocumentCreatedEvent = z.infer<typeof DocumentCreatedEventSchema>;

// ─── Updated ─────────────────────────────────────────────────────────────────

/** @alias {@link COMM_DOCUMENT_UPDATED} */
export const DocumentUpdatedEventSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  updatedByPrincipalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommDocumentUpdatedEventType = COMM_DOCUMENT_UPDATED;
export type DocumentUpdatedEvent = z.infer<typeof DocumentUpdatedEventSchema>;

// ─── Published ───────────────────────────────────────────────────────────────

/** @alias {@link COMM_DOCUMENT_PUBLISHED} */
export const DocumentPublishedEventSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  publishedByPrincipalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommDocumentPublishedEventType = COMM_DOCUMENT_PUBLISHED;
export type DocumentPublishedEvent = z.infer<typeof DocumentPublishedEventSchema>;

// ─── Archived ────────────────────────────────────────────────────────────────

/** @alias {@link COMM_DOCUMENT_ARCHIVED} */
export const DocumentArchivedEventSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  archivedByPrincipalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommDocumentArchivedEventType = COMM_DOCUMENT_ARCHIVED;
export type DocumentArchivedEvent = z.infer<typeof DocumentArchivedEventSchema>;

// ─── CollaboratorAdded ───────────────────────────────────────────────────────

/** @alias {@link COMM_DOCUMENT_COLLABORATOR_ADDED} */
export const DocumentCollaboratorAddedEventSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  role: CollaboratorRoleSchema,
  addedByPrincipalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommDocumentCollaboratorAddedEventType = COMM_DOCUMENT_COLLABORATOR_ADDED;
export type DocumentCollaboratorAddedEvent = z.infer<typeof DocumentCollaboratorAddedEventSchema>;

// ─── CollaboratorRemoved ─────────────────────────────────────────────────────

/** @alias {@link COMM_DOCUMENT_COLLABORATOR_REMOVED} */
export const DocumentCollaboratorRemovedEventSchema = z.object({
  documentId: CommDocumentIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  removedByPrincipalId: PrincipalIdSchema,
  correlationId: CorrelationIdSchema,
});

export const CommDocumentCollaboratorRemovedEventType = COMM_DOCUMENT_COLLABORATOR_REMOVED;
export type DocumentCollaboratorRemovedEvent = z.infer<typeof DocumentCollaboratorRemovedEventSchema>;
