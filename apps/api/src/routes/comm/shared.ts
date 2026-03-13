import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AddCommentCommandSchema,
  AssignLabelCommandSchema,
  CommChatterContextEntityTypeSchema,
  ListChatterMessagesQuerySchema,
  PostChatterMessageCommandSchema,
  type CommChatterContextEntityType,
  type CommCommentEntityType,
  type CommInboxEntityType,
  CommInboxItemSchema,
  CommNotificationPreferenceSchema,
  type CommSavedViewEntityType,
  type CommSubscriptionEntityType,
  CommCommentEntityTypeSchema,
  CommInboxEntityTypeSchema,
  CommSavedViewEntityTypeSchema,
  CommSubscriptionEntityTypeSchema,
  MarkAllInboxReadCommandSchema,
  MarkInboxItemReadCommandSchema,
  CommSavedViewSchema,
  CommSubscriptionSchema,
  CommLabelEntityTypeSchema,
  CommLabelSchema,
  UpsertNotificationPreferenceCommandSchema,
  CreateLabelCommandSchema,
  DeleteSavedViewCommandSchema,
  DeleteLabelCommandSchema,
  DeleteCommentCommandSchema,
  EditCommentCommandSchema,
  SaveViewCommandSchema,
  SubscribeEntityCommandSchema,
  UnassignLabelCommandSchema,
  UnsubscribeEntityCommandSchema,
  UpdateSavedViewCommandSchema,
  UpdateLabelCommandSchema,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  addComment,
  assignLabel,
  createLabel,
  deleteSavedView,
  deleteComment,
  deleteLabel,
  editComment,
  listSavedViews,
  saveView,
  listChatterMessages,
  listComments,
  listInboxItems,
  listNotificationPreferences,
  countUnreadInboxItems,
  markInboxItemRead,
  markAllInboxRead,
  upsertNotificationPreference,
  listEntityLabels,
  listLabels,
  listSubscriptionsForEntity,
  subscribeEntity,
  unassignLabel,
  unsubscribeEntity,
  updateSavedView,
  updateLabel,
  postChatterMessage,
} from "@afenda/core";
import type { CommCommentPolicyContext, OrgScopedContext } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../helpers/responses.js";

const CommCommentSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  entityType: CommCommentEntityTypeSchema,
  entityId: z.string(),
  parentCommentId: z.string().uuid().nullable(),
  authorPrincipalId: z.string().uuid(),
  body: z.string(),
  editedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CommChatterMessageSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  entityType: CommChatterContextEntityTypeSchema,
  entityId: z.string(),
  parentMessageId: z.string().uuid().nullable(),
  authorPrincipalId: z.string().uuid(),
  body: z.string(),
  editedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CommentListResponseSchema = makeSuccessSchema(z.array(CommCommentSchema));
const CommentMutationResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));
const ChatterListResponseSchema = makeSuccessSchema(z.array(CommChatterMessageSchema));
const ChatterMutationResponseSchema = makeSuccessSchema(z.object({ messageId: z.string().uuid() }));
const LabelListResponseSchema = makeSuccessSchema(z.array(CommLabelSchema));
const LabelMutationResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));
const SavedViewListResponseSchema = makeSuccessSchema(z.array(CommSavedViewSchema));
const SavedViewMutationResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));
const SubscriptionListResponseSchema = makeSuccessSchema(z.array(CommSubscriptionSchema));
const SubscriptionMutationResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));
const InboxItemListResponseSchema = makeSuccessSchema(z.array(CommInboxItemSchema));
const InboxUnreadCountResponseSchema = makeSuccessSchema(z.object({ count: z.number().int() }));
const NotificationPreferenceListResponseSchema = makeSuccessSchema(
  z.array(CommNotificationPreferenceSchema),
);
const InboxMutationResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));
const InboxBulkMutationResponseSchema = makeSuccessSchema(z.object({ count: z.number().int() }));
const ChatterMessagesQueryWithCoercionSchema = ListChatterMessagesQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): CommCommentPolicyContext {
  return { principalId: req.ctx?.principalId ?? null };
}

function formatCommentRow(row: {
  id: string;
  orgId: string;
  entityType: CommCommentEntityType;
  entityId: string;
  parentCommentId: string | null;
  authorPrincipalId: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatChatterMessageRow(row: {
  id: string;
  orgId: string;
  entityType: CommCommentEntityType;
  entityId: string;
  parentCommentId: string | null;
  authorPrincipalId: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  if (row.entityType !== "task" && row.entityType !== "project") {
    throw new Error(`Invalid chatter entity type: ${row.entityType}`);
  }

  return {
    id: row.id,
    orgId: row.orgId,
    entityType: row.entityType,
    entityId: row.entityId,
    parentMessageId: row.parentCommentId,
    authorPrincipalId: row.authorPrincipalId,
    body: row.body,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatSavedViewRow(row: {
  id: string;
  orgId: string;
  principalId: string | null;
  entityType: CommSavedViewEntityType;
  name: string;
  filters: Record<string, unknown>;
  sortBy: unknown[];
  columns: unknown[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatSubscriptionRow(row: {
  id: string;
  orgId: string;
  principalId: string;
  entityType: CommSubscriptionEntityType;
  entityId: string;
  createdAt: Date;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatInboxItemRow(row: {
  id: string;
  orgId: string;
  principalId: string;
  eventType: string;
  entityType: CommInboxEntityType;
  entityId: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: Date | null;
  occurredAt: Date;
  createdAt: Date;
}) {
  return {
    ...row,
    readAt: row.readAt?.toISOString() ?? null,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function formatNotificationPreferenceRow(row: {
  id: string;
  orgId: string;
  principalId: string;
  eventType: string;
  channel: "in_app" | "email";
  enabled: boolean;
  mutedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    mutedUntil: row.mutedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function commSharedRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/comments",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          entityType: CommCommentEntityTypeSchema,
          entityId: z.string().min(1),
          limit: z.coerce.number().int().min(1).max(500).optional(),
        }),
        response: {
          200: CommentListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listComments(app.db, {
        orgId,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        limit: req.query.limit,
      });

      return reply.status(200).send({
        data: rows.map((row) => formatCommentRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/chatter/messages",
    {
      schema: {
        tags: ["COMM Chatter"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: ChatterMessagesQueryWithCoercionSchema,
        response: {
          200: ChatterListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listChatterMessages(app.db, {
        orgId,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        limit: req.query.limit,
      });

      return reply.status(200).send({
        data: rows.map((row) => formatChatterMessageRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/add-comment",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddCommentCommandSchema,
        response: {
          201: CommentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await addComment(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_COMMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/chatter/post-message",
    {
      schema: {
        tags: ["COMM Chatter"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: PostChatterMessageCommandSchema,
        response: {
          201: ChatterMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await postChatterMessage(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_COMMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.get(
    "/saved-views",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          entityType: CommSavedViewEntityTypeSchema,
        }),
        response: {
          200: SavedViewListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listSavedViews(app.db, orgId, req.query.entityType, auth.principalId);
      return reply.status(200).send({
        data: rows.map((row) => formatSavedViewRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/save-view",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SaveViewCommandSchema,
        response: {
          201: SavedViewMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await saveView(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/update-saved-view",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateSavedViewCommandSchema,
        response: {
          200: SavedViewMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await updateSavedView(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_SAVED_VIEW_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/delete-saved-view",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeleteSavedViewCommandSchema,
        response: {
          200: SavedViewMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await deleteSavedView(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_SAVED_VIEW_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.get(
    "/subscriptions",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          entityType: CommSubscriptionEntityTypeSchema,
          entityId: z.string().min(1),
        }),
        response: {
          200: SubscriptionListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listSubscriptionsForEntity(
        app.db,
        orgId,
        req.query.entityType,
        req.query.entityId,
      );

      return reply.status(200).send({
        data: rows.map((row) => formatSubscriptionRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/subscribe-entity",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SubscribeEntityCommandSchema,
        response: {
          201: SubscriptionMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await subscribeEntity(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/unsubscribe-entity",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UnsubscribeEntityCommandSchema,
        response: {
          200: SubscriptionMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await unsubscribeEntity(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_SUBSCRIPTION_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.get(
    "/inbox",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(200).optional(),
          cursor: z.string().datetime().optional(),
          unreadOnly: z.coerce.boolean().optional(),
        }),
        response: {
          200: InboxItemListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listInboxItems(app.db, orgId, auth.principalId, {
        limit: req.query.limit,
        cursor: req.query.cursor,
        unreadOnly: req.query.unreadOnly,
      });

      return reply.status(200).send({
        data: rows.map((row) => formatInboxItemRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/inbox/unread",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: InboxUnreadCountResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const count = await countUnreadInboxItems(app.db, orgId, auth.principalId);
      return reply.status(200).send({ data: { count }, correlationId: req.correlationId });
    },
  );

  typed.get(
    "/inbox/preferences",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: NotificationPreferenceListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listNotificationPreferences(app.db, orgId, auth.principalId);
      return reply.status(200).send({
        data: rows.map((row) => formatNotificationPreferenceRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/mark-inbox-item-read",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: MarkInboxItemReadCommandSchema,
        response: {
          200: InboxMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await markInboxItemRead(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_INBOX_ITEM_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/mark-all-inbox-read",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: MarkAllInboxReadCommandSchema,
        response: {
          200: InboxBulkMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await markAllInboxRead(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/upsert-notification-preference",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpsertNotificationPreferenceCommandSchema,
        response: {
          200: InboxMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await upsertNotificationPreference(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/edit-comment",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: EditCommentCommandSchema,
        response: {
          200: CommentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await editComment(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_COMMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/delete-comment",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeleteCommentCommandSchema,
        response: {
          200: CommentMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await deleteComment(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_COMMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.get(
    "/labels",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: LabelListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listLabels(app.db, orgId);
      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/labels/entity",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          entityType: CommLabelEntityTypeSchema,
          entityId: z.string().min(1),
        }),
        response: {
          200: LabelListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listEntityLabels(app.db, orgId, req.query.entityType, req.query.entityId);
      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/create-label",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateLabelCommandSchema,
        response: {
          201: LabelMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await createLabel(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/update-label",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateLabelCommandSchema,
        response: {
          200: LabelMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await updateLabel(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_LABEL_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/delete-label",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeleteLabelCommandSchema,
        response: {
          200: LabelMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await deleteLabel(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_LABEL_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/assign-label",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AssignLabelCommandSchema,
        response: {
          200: LabelMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await assignLabel(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_LABEL_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/unassign-label",
    {
      schema: {
        tags: ["COMM Shared"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UnassignLabelCommandSchema,
        response: {
          200: LabelMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await unassignLabel(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_LABEL_ASSIGNMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
