import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AddDocumentCollaboratorCommandSchema,
  ArchiveCommDocumentCommandSchema,
  CollaboratorRoleSchema,
  CommDocumentStatusSchema,
  CommDocumentTypeSchema,
  CommDocumentVisibilitySchema,
  CreateCommDocumentCommandSchema,
  PublishCommDocumentCommandSchema,
  RemoveDocumentCollaboratorCommandSchema,
  UpdateCommDocumentCommandSchema,
  type CommDocumentId,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  addDocumentCollaborator,
  archiveDocument,
  createDocument,
  getDocumentBreadcrumb,
  getDocumentById,
  getDocumentBySlug,
  listChildDocuments,
  listCommDocuments,
  listDocumentCollaborators,
  listDocumentVersions,
  publishDocument,
  removeDocumentCollaborator,
  updateDocument,
} from "@afenda/core";
import type {
  CollaboratorRow,
  CommDocumentPolicyContext,
  DocumentRow,
  DocumentVersionRow,
  OrgScopedContext,
} from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../helpers/responses.js";

const DOCUMENT_READ_PERMISSION = "comm.document.read";
const DOCUMENT_WRITE_PERMISSION = "comm.document.write";
const DOCUMENT_MANAGE_PERMISSION = "comm.document.manage";

function canReadDocument(permissionsSet: ReadonlySet<string>): boolean {
  return (
    permissionsSet.has(DOCUMENT_READ_PERMISSION) ||
    permissionsSet.has(DOCUMENT_WRITE_PERMISSION) ||
    permissionsSet.has(DOCUMENT_MANAGE_PERMISSION)
  );
}

function canWriteDocument(permissionsSet: ReadonlySet<string>): boolean {
  return (
    permissionsSet.has(DOCUMENT_WRITE_PERMISSION) || permissionsSet.has(DOCUMENT_MANAGE_PERMISSION)
  );
}

function denyDocumentPermission(req: FastifyRequest, reply: FastifyReply, permission: string) {
  return reply.status(403 as const).send({
    error: {
      code: "SHARED_FORBIDDEN",
      message: `Requires ${permission} permission`,
    },
    correlationId: req.correlationId,
  });
}

const DocumentMutationResponseSchema = makeSuccessSchema(
  z.object({ id: z.string().uuid(), documentNumber: z.string().optional() }),
);

const DocumentRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  documentNumber: z.string(),
  title: z.string(),
  body: z.string(),
  status: CommDocumentStatusSchema,
  documentType: CommDocumentTypeSchema,
  visibility: CommDocumentVisibilitySchema,
  slug: z.string().nullable(),
  parentDocId: z.string().uuid().nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  publishedByPrincipalId: z.string().uuid().nullable(),
  createdByPrincipalId: z.string().uuid(),
  lastEditedByPrincipalId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const DocumentVersionRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  documentId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  createdByPrincipalId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
});

const CollaboratorRowSchema = z.object({
  documentId: z.string().uuid(),
  orgId: z.string().uuid(),
  principalId: z.string().uuid(),
  role: CollaboratorRoleSchema,
  addedByPrincipalId: z.string().uuid(),
  addedAt: z.string().datetime({ offset: true }),
});

const DocumentListResponseSchema = makeSuccessSchema(
  z.object({
    data: z.array(DocumentRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): CommDocumentPolicyContext {
  return { principalId: req.ctx?.principalId ?? null };
}

function serializeDocument(row: DocumentRow) {
  return {
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeVersion(row: DocumentVersionRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeCollaborator(row: CollaboratorRow) {
  return {
    ...row,
    addedAt: row.addedAt.toISOString(),
  };
}

const DocumentDetailResponseSchema = makeSuccessSchema(DocumentRowSchema);

const DocumentHistoryResponseSchema = makeSuccessSchema(
  z.object({ data: z.array(DocumentVersionRowSchema) }),
);

const CollaboratorListResponseSchema = makeSuccessSchema(
  z.object({ data: z.array(CollaboratorRowSchema) }),
);

const CollaboratorMutationResponseSchema = makeSuccessSchema(
  z.object({ documentId: z.string().uuid(), principalId: z.string().uuid() }),
);

export async function commDocumentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/comm-documents",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
          status: CommDocumentStatusSchema.optional(),
          documentType: CommDocumentTypeSchema.optional(),
        }),
        response: {
          200: DocumentListResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const page = await listCommDocuments(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        documentType: req.query.documentType,
        status: req.query.status,
      });

      return reply.status(200).send({
        data: {
          data: page.data.map(serializeDocument),
          cursor: page.cursor,
          hasMore: page.hasMore,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-documents/by-slug/:slug",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ slug: z.string().min(1).max(200) }),
        response: {
          200: DocumentDetailResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const document = await getDocumentBySlug(app.db, orgId as OrgId, req.params.slug);
      if (!document) {
        return reply.status(404).send({
          error: { code: "COMM_DOCUMENT_NOT_FOUND", message: "Document not found" },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: serializeDocument(document),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-documents/:id",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: DocumentDetailResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const document = await getDocumentById(
        app.db,
        orgId as OrgId,
        req.params.id as CommDocumentId,
      );
      if (!document) {
        return reply.status(404).send({
          error: { code: "COMM_DOCUMENT_NOT_FOUND", message: "Document not found" },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: serializeDocument(document),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-documents/:id/children",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(DocumentRowSchema) })),
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const children = await listChildDocuments(
        app.db,
        orgId as OrgId,
        req.params.id as CommDocumentId,
      );
      return reply.status(200).send({
        data: { data: children.map(serializeDocument) },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-documents/:id/breadcrumb",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(DocumentRowSchema) })),
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const breadcrumb = await getDocumentBreadcrumb(
        app.db,
        orgId as OrgId,
        req.params.id as CommDocumentId,
      );
      return reply.status(200).send({
        data: { data: breadcrumb.map(serializeDocument) },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-documents/:id/history",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: DocumentHistoryResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const versions = await listDocumentVersions(
        app.db,
        orgId as OrgId,
        req.params.id as CommDocumentId,
      );
      return reply.status(200).send({
        data: { data: versions.map(serializeVersion) },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-documents/:id/collaborators",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: CollaboratorListResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canReadDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_READ_PERMISSION);
      }

      const collaborators = await listDocumentCollaborators(
        app.db,
        orgId as OrgId,
        req.params.id as CommDocumentId,
      );
      return reply.status(200).send({
        data: { data: collaborators.map(serializeCollaborator) },
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-documents/create",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateCommDocumentCommandSchema,
        response: {
          200: DocumentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canWriteDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_WRITE_PERMISSION);
      }

      const result = await createDocument(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({ error: result.error, correlationId: req.correlationId });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/comm-documents/update",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateCommDocumentCommandSchema,
        response: {
          200: DocumentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!canWriteDocument(auth.permissionsSet)) {
        return denyDocumentPermission(req, reply, DOCUMENT_WRITE_PERMISSION);
      }

      const result = await updateDocument(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({ error: result.error, correlationId: req.correlationId });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/comm-documents/publish",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: PublishCommDocumentCommandSchema,
        response: {
          200: DocumentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!auth.permissionsSet.has(DOCUMENT_MANAGE_PERMISSION)) {
        return denyDocumentPermission(req, reply, DOCUMENT_MANAGE_PERMISSION);
      }

      const result = await publishDocument(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({ error: result.error, correlationId: req.correlationId });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/comm-documents/archive",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ArchiveCommDocumentCommandSchema,
        response: {
          200: DocumentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!auth.permissionsSet.has(DOCUMENT_MANAGE_PERMISSION)) {
        return denyDocumentPermission(req, reply, DOCUMENT_MANAGE_PERMISSION);
      }

      const result = await archiveDocument(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({ error: result.error, correlationId: req.correlationId });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/comm-documents/add-collaborator",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddDocumentCollaboratorCommandSchema,
        response: {
          200: CollaboratorMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!auth.permissionsSet.has(DOCUMENT_MANAGE_PERMISSION)) {
        return denyDocumentPermission(req, reply, DOCUMENT_MANAGE_PERMISSION);
      }

      const result = await addDocumentCollaborator(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({ error: result.error, correlationId: req.correlationId });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/comm-documents/remove-collaborator",
    {
      schema: {
        tags: ["COMM Docs"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RemoveDocumentCollaboratorCommandSchema,
        response: {
          200: CollaboratorMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      if (!auth.permissionsSet.has(DOCUMENT_MANAGE_PERMISSION)) {
        return denyDocumentPermission(req, reply, DOCUMENT_MANAGE_PERMISSION);
      }

      const result = await removeDocumentCollaborator(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({ error: result.error, correlationId: req.correlationId });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
