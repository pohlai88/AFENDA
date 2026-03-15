import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateAnnouncementCommandSchema,
  PublishAnnouncementCommandSchema,
  ScheduleAnnouncementCommandSchema,
  ArchiveAnnouncementCommandSchema,
  AcknowledgeAnnouncementCommandSchema,
  AnnouncementStatusSchema,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
  type AnnouncementId,
} from "@afenda/contracts";
import {
  createAnnouncement,
  publishAnnouncement,
  scheduleAnnouncement,
  archiveAnnouncement,
  acknowledgeAnnouncement,
  listAnnouncements,
  getAnnouncementById,
  listAnnouncementReads,
  getAnnouncementReadByPrincipal,
  listAnnouncementAudienceOptions,
  getAnnouncementAckSummary,
} from "@afenda/core";
import type {
  CommAnnouncementPolicyContext,
  OrgScopedContext,
  AnnouncementRow,
  AnnouncementReadRow,
} from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../helpers/responses.js";
import { serializeDate } from "../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../helpers/context.js";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AnnouncementMutationResponseSchema = makeSuccessSchema(
  z.object({ id: z.string().uuid(), announcementNumber: z.string().optional() }),
);

const AnnouncementRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  announcementNumber: z.string(),
  title: z.string(),
  body: z.string(),
  status: AnnouncementStatusSchema,
  audienceType: z.string(),
  audienceIds: z.array(z.string()).or(z.unknown()),
  scheduledAt: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
  publishedByPrincipalId: z.string().uuid().nullable(),
  createdByPrincipalId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const AnnouncementReadRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  announcementId: z.string().uuid(),
  principalId: z.string().uuid(),
  acknowledgedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

const AnnouncementListResponseSchema = makeSuccessSchema(
  z.object({
    data: z.array(AnnouncementRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

const AnnouncementDetailResponseSchema = makeSuccessSchema(AnnouncementRowSchema);

const AnnouncementReadsResponseSchema = makeSuccessSchema(
  z.object({ data: z.array(AnnouncementReadRowSchema) }),
);

const AnnouncementMyReadResponseSchema = makeSuccessSchema(
  z.object({
    acknowledged: z.boolean(),
    readAt: z.string().datetime().nullable(),
    readId: z.string().uuid().nullable(),
  }),
);

const AnnouncementAckSummaryResponseSchema = makeSuccessSchema(
  z.object({
    announcementId: z.string().uuid(),
    targetedCount: z.number().int().nonnegative(),
    acknowledgedCount: z.number().int().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    progressPercent: z.number().int().min(0).max(100),
  }),
);

const AnnouncementAudienceOptionsResponseSchema = makeSuccessSchema(
  z.object({
    teams: z.array(z.object({ id: z.string().uuid(), label: z.string() })),
    roles: z.array(z.object({ id: z.string().uuid(), label: z.string() })),
  }),
);

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function serializeAnnouncement(row: AnnouncementRow) {
  return {
    ...row,
    audienceIds: row.audienceIds,
    scheduledAt: serializeDate(row.scheduledAt),
    publishedAt: serializeDate(row.publishedAt),
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

function serializeRead(row: AnnouncementReadRow) {
  return {
    ...row,
    acknowledgedAt: serializeDate(row.acknowledgedAt),
    createdAt: serializeDate(row.createdAt)!,
  };
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function commAnnouncementRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  typed.get(
    "/announcements",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
          status: AnnouncementStatusSchema.optional(),
          myAnnouncements: z.coerce.boolean().optional(),
        }),
        response: {
          200: AnnouncementListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listAnnouncements(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
        createdByPrincipalId: req.query.myAnnouncements
          ? (req.ctx?.principalId as PrincipalId)
          : undefined,
      });

      return reply.status(200).send({
        data: {
          data: page.data.map(serializeAnnouncement),
          cursor: page.cursor,
          hasMore: page.hasMore,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/announcements/:id",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AnnouncementDetailResponseSchema,
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

      const announcement = await getAnnouncementById(
        app.db,
        orgId as OrgId,
        req.params.id as AnnouncementId,
      );

      if (!announcement) {
        return reply.status(404).send({
          error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: serializeAnnouncement(announcement),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/announcements/:id/reads",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AnnouncementReadsResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const reads = await listAnnouncementReads(
        app.db,
        orgId as OrgId,
        req.params.id as AnnouncementId,
      );

      return reply.status(200).send({
        data: { data: reads.map(serializeRead) },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/announcements/:id/my-read",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AnnouncementMyReadResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const row = await getAnnouncementReadByPrincipal(
        app.db,
        orgId as OrgId,
        req.params.id as AnnouncementId,
        auth.principalId,
      );

      return reply.status(200).send({
        data: {
          acknowledged: Boolean(row?.acknowledgedAt),
          readAt: serializeDate(row?.acknowledgedAt),
          readId: row?.id ?? null,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/announcements/:id/ack-summary",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AnnouncementAckSummaryResponseSchema,
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

      const summary = await getAnnouncementAckSummary(
        app.db,
        orgId as OrgId,
        req.params.id as AnnouncementId,
      );

      if (!summary) {
        return reply.status(404).send({
          error: { code: "COMM_ANNOUNCEMENT_NOT_FOUND", message: "Announcement not found" },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: summary,
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/announcement-audience-options",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: AnnouncementAudienceOptionsResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const options = await listAnnouncementAudienceOptions(app.db, orgId as OrgId);

      return reply.status(200).send({
        data: options,
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ Commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  typed.post(
    "/commands/create-announcement",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateAnnouncementCommandSchema,
        response: {
          201: AnnouncementMutationResponseSchema,
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

      const result = await createAnnouncement(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/publish-announcement",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: PublishAnnouncementCommandSchema,
        response: {
          200: AnnouncementMutationResponseSchema,
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

      const result = await publishAnnouncement(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_ANNOUNCEMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/schedule-announcement",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ScheduleAnnouncementCommandSchema,
        response: {
          200: AnnouncementMutationResponseSchema,
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

      const result = await scheduleAnnouncement(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_ANNOUNCEMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/archive-announcement",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ArchiveAnnouncementCommandSchema,
        response: {
          200: AnnouncementMutationResponseSchema,
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

      const result = await archiveAnnouncement(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_ANNOUNCEMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/acknowledge-announcement",
    {
      schema: {
        tags: ["COMM Announcements"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AcknowledgeAnnouncementCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await acknowledgeAnnouncement(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_ANNOUNCEMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
