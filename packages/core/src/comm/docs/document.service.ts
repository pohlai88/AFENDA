import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import {
  commDocument,
  commDocumentCollaborator,
  commDocumentVersion,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  AddDocumentCollaboratorCommand,
  ArchiveCommDocumentCommand,
  CommDocumentId,
  CorrelationId,
  CreateCommDocumentCommand,
  OrgId,
  PrincipalId,
  PublishCommDocumentCommand,
  RemoveDocumentCollaboratorCommand,
  UpdateCommDocumentCommand,
} from "@afenda/contracts";
import {
  COMM_DOCUMENT_ARCHIVED,
  COMM_DOCUMENT_COLLABORATOR_ADDED,
  COMM_DOCUMENT_COLLABORATOR_REMOVED,
  COMM_DOCUMENT_CREATED,
  COMM_DOCUMENT_PUBLISHED,
  COMM_DOCUMENT_UPDATED,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";
import { findCollaborator } from "./document.queries.js";

export interface CommDocumentPolicyContext {
  principalId: PrincipalId | null;
}

export type CommDocumentServiceError = {
  code: string;
  message: string;
};

export type CommDocumentServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommDocumentServiceError };

function buildDocumentNumber(): string {
  return `DOC-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function requirePrincipal(
  policyCtx: CommDocumentPolicyContext,
): CommDocumentServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  return { ok: true, data: policyCtx.principalId };
}

async function loadDocument(db: DbClient, orgId: OrgId, documentId: CommDocumentId) {
  const [row] = await db
    .select()
    .from(commDocument)
    .where(and(eq(commDocument.orgId, orgId), eq(commDocument.id, documentId)));

  return row ?? null;
}

async function loadDocumentBySlug(db: DbClient, orgId: OrgId, slug: string) {
  const [row] = await db
    .select()
    .from(commDocument)
    .where(and(eq(commDocument.orgId, orgId), eq(commDocument.slug, slug)));
  return row ?? null;
}

async function nextVersionNumber(
  db: DbClient,
  orgId: OrgId,
  documentId: CommDocumentId,
): Promise<number> {
  const versions = await db
    .select({ versionNumber: commDocumentVersion.versionNumber })
    .from(commDocumentVersion)
    .where(
      and(eq(commDocumentVersion.orgId, orgId), eq(commDocumentVersion.documentId, documentId)),
    );

  const latest = versions.reduce(
    (acc, row) => (row.versionNumber > acc ? row.versionNumber : acc),
    0,
  );
  return latest + 1;
}

export async function createDocument(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommDocumentPolicyContext,
  correlationId: CorrelationId,
  params: CreateCommDocumentCommand,
): Promise<CommDocumentServiceResult<{ id: CommDocumentId; documentNumber: string }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;
  const documentNumber = buildDocumentNumber();

  if (params.parentDocId) {
    const parent = await loadDocument(db, orgId, params.parentDocId);
    if (!parent) {
      return {
        ok: false,
        error: {
          code: "COMM_DOCUMENT_PARENT_NOT_FOUND",
          message: "Parent document not found",
        },
      };
    }
  }

  if (params.slug) {
    const existing = await loadDocumentBySlug(db, orgId, params.slug);
    if (existing) {
      return {
        ok: false,
        error: {
          code: "COMM_DOCUMENT_SLUG_TAKEN",
          message: `Slug "${params.slug}" is already in use`,
        },
      };
    }
  }

  const documentType = params.documentType ?? "page";
  const visibility = params.visibility ?? "org";

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "document.created",
      entityType: "document" as const,
      correlationId,
      details: { documentNumber, title: params.title },
    },
    async (tx) => {
      const [document] = await tx
        .insert(commDocument)
        .values({
          orgId,
          documentNumber,
          title: params.title,
          body: params.body,
          status: "draft",
          documentType,
          visibility,
          slug: params.slug ?? null,
          parentDocId: params.parentDocId ?? null,
          createdByPrincipalId: principalId,
        })
        .returning();

      await tx.insert(commDocumentVersion).values({
        orgId,
        documentId: document!.id,
        versionNumber: 1,
        title: params.title,
        body: params.body,
        createdByPrincipalId: principalId,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_DOCUMENT_CREATED,
        version: "1",
        correlationId,
        payload: {
          documentId: document!.id,
          documentNumber,
          title: params.title,
          orgId,
          correlationId,
        },
      });

      return document!;
    },
  );

  return { ok: true, data: { id: result.id as CommDocumentId, documentNumber } };
}

export async function updateDocument(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommDocumentPolicyContext,
  correlationId: CorrelationId,
  params: UpdateCommDocumentCommand,
): Promise<CommDocumentServiceResult<{ id: CommDocumentId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const existing = await loadDocument(db, orgId, params.documentId);
  if (!existing) {
    return { ok: false, error: { code: "COMM_DOCUMENT_NOT_FOUND", message: "Document not found" } };
  }

  if (existing.status === "archived") {
    return {
      ok: false,
      error: {
        code: "COMM_DOCUMENT_ALREADY_ARCHIVED",
        message: "Archived document cannot be updated",
      },
    };
  }

  if (params.slug !== undefined && params.slug !== null && params.slug !== existing.slug) {
    const slugTaken = await loadDocumentBySlug(db, orgId, params.slug);
    if (slugTaken) {
      return {
        ok: false,
        error: {
          code: "COMM_DOCUMENT_SLUG_TAKEN",
          message: `Slug "${params.slug}" is already in use`,
        },
      };
    }
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "document.updated",
      entityType: "document" as const,
      correlationId,
      details: { documentNumber: existing.documentNumber, title: params.title },
    },
    async (tx) => {
      const versionNumber = await nextVersionNumber(tx as DbClient, orgId, params.documentId);

      const [updated] = await tx
        .update(commDocument)
        .set({
          title: params.title,
          body: params.body,
          lastEditedByPrincipalId: principalId,
          updatedAt: sql`now()`,
          ...(params.documentType !== undefined && { documentType: params.documentType }),
          ...(params.visibility !== undefined && { visibility: params.visibility }),
          ...(params.slug !== undefined && { slug: params.slug }),
          ...(params.parentDocId !== undefined && { parentDocId: params.parentDocId }),
        })
        .where(and(eq(commDocument.orgId, orgId), eq(commDocument.id, params.documentId)))
        .returning();

      await tx.insert(commDocumentVersion).values({
        orgId,
        documentId: params.documentId,
        versionNumber,
        title: params.title,
        body: params.body,
        createdByPrincipalId: principalId,
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_DOCUMENT_UPDATED,
        version: "1",
        correlationId,
        payload: {
          documentId: params.documentId,
          documentNumber: existing.documentNumber,
          versionNumber,
          orgId,
          correlationId,
        },
      });

      return updated!;
    },
  );

  return { ok: true, data: { id: result.id as CommDocumentId } };
}

export async function publishDocument(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommDocumentPolicyContext,
  correlationId: CorrelationId,
  params: PublishCommDocumentCommand,
): Promise<CommDocumentServiceResult<{ id: CommDocumentId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const existing = await loadDocument(db, orgId, params.documentId);
  if (!existing) {
    return { ok: false, error: { code: "COMM_DOCUMENT_NOT_FOUND", message: "Document not found" } };
  }

  if (existing.status === "published") {
    return {
      ok: false,
      error: { code: "COMM_DOCUMENT_ALREADY_PUBLISHED", message: "Document is already published" },
    };
  }

  if (existing.status === "archived") {
    return {
      ok: false,
      error: {
        code: "COMM_DOCUMENT_ALREADY_ARCHIVED",
        message: "Archived document cannot be published",
      },
    };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "document.published",
      entityType: "document" as const,
      correlationId,
      details: { documentNumber: existing.documentNumber, title: existing.title },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commDocument)
        .set({
          status: "published",
          publishedAt: sql`now()`,
          publishedByPrincipalId: principalId,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commDocument.orgId, orgId), eq(commDocument.id, params.documentId)))
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_DOCUMENT_PUBLISHED,
        version: "1",
        correlationId,
        payload: {
          documentId: params.documentId,
          documentNumber: existing.documentNumber,
          title: existing.title,
          orgId,
          correlationId,
        },
      });

      return updated!;
    },
  );

  return { ok: true, data: { id: result.id as CommDocumentId } };
}

export async function archiveDocument(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommDocumentPolicyContext,
  correlationId: CorrelationId,
  params: ArchiveCommDocumentCommand,
): Promise<CommDocumentServiceResult<{ id: CommDocumentId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const existing = await loadDocument(db, orgId, params.documentId);
  if (!existing) {
    return { ok: false, error: { code: "COMM_DOCUMENT_NOT_FOUND", message: "Document not found" } };
  }

  if (existing.status === "archived") {
    return {
      ok: false,
      error: { code: "COMM_DOCUMENT_ALREADY_ARCHIVED", message: "Document is already archived" },
    };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "document.archived",
      entityType: "document" as const,
      correlationId,
      details: { documentNumber: existing.documentNumber, title: existing.title },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commDocument)
        .set({ status: "archived", updatedAt: sql`now()` })
        .where(and(eq(commDocument.orgId, orgId), eq(commDocument.id, params.documentId)))
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_DOCUMENT_ARCHIVED,
        version: "1",
        correlationId,
        payload: {
          documentId: params.documentId,
          documentNumber: existing.documentNumber,
          orgId,
          correlationId,
        },
      });

      return updated!;
    },
  );

  return { ok: true, data: { id: result.id as CommDocumentId } };
}

export async function addDocumentCollaborator(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommDocumentPolicyContext,
  correlationId: CorrelationId,
  params: AddDocumentCollaboratorCommand,
): Promise<CommDocumentServiceResult<{ documentId: CommDocumentId; principalId: PrincipalId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const actorPrincipalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const existing = await db.query.commDocument.findFirst({
    where: and(eq(commDocument.id, params.documentId), eq(commDocument.orgId, orgId)),
  });
  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_DOCUMENT_NOT_FOUND", message: "Document not found." },
    };
  }

  const collaborator = await findCollaborator(
    db,
    params.documentId as CommDocumentId,
    params.principalId as PrincipalId,
  );
  if (collaborator) {
    return {
      ok: false,
      error: {
        code: "COMM_DOCUMENT_COLLABORATOR_ALREADY_EXISTS",
        message: "Principal is already a collaborator on this document.",
      },
    };
  }

  await withAudit<void>(
    db,
    ctx,
    {
      actorPrincipalId,
      action: "document.collaborator.added",
      entityType: "comm_document",
      correlationId,
      details: {
        documentId: params.documentId,
        principalId: params.principalId,
        role: params.role ?? "editor",
      },
    },
    async (tx) => {
      await tx.insert(commDocumentCollaborator).values({
        documentId: params.documentId,
        orgId,
        principalId: params.principalId as PrincipalId,
        role: params.role ?? "editor",
        addedByPrincipalId: actorPrincipalId,
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_DOCUMENT_COLLABORATOR_ADDED,
        version: "1",
        correlationId,
        payload: {
          documentId: params.documentId,
          principalId: params.principalId,
          role: params.role ?? "editor",
          orgId,
          correlationId,
        },
      });
    },
  );

  return {
    ok: true,
    data: {
      documentId: params.documentId as CommDocumentId,
      principalId: params.principalId as PrincipalId,
    },
  };
}

export async function removeDocumentCollaborator(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommDocumentPolicyContext,
  correlationId: CorrelationId,
  params: RemoveDocumentCollaboratorCommand,
): Promise<CommDocumentServiceResult<{ documentId: CommDocumentId; principalId: PrincipalId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;
  const actorPrincipalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const collaborator = await findCollaborator(
    db,
    params.documentId as CommDocumentId,
    params.principalId as PrincipalId,
  );
  if (!collaborator) {
    return {
      ok: false,
      error: {
        code: "COMM_DOCUMENT_COLLABORATOR_NOT_FOUND",
        message: "Collaborator not found on this document.",
      },
    };
  }

  await withAudit<void>(
    db,
    ctx,
    {
      actorPrincipalId,
      action: "document.collaborator.removed",
      entityType: "comm_document",
      correlationId,
      details: { documentId: params.documentId, principalId: params.principalId },
    },
    async (tx) => {
      await tx
        .delete(commDocumentCollaborator)
        .where(
          and(
            eq(commDocumentCollaborator.documentId, params.documentId),
            eq(commDocumentCollaborator.principalId, params.principalId as PrincipalId),
          ),
        );
      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_DOCUMENT_COLLABORATOR_REMOVED,
        version: "1",
        correlationId,
        payload: {
          documentId: params.documentId,
          principalId: params.principalId,
          orgId,
          correlationId,
        },
      });
    },
  );

  return {
    ok: true,
    data: {
      documentId: params.documentId as CommDocumentId,
      principalId: params.principalId as PrincipalId,
    },
  };
}
