import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AddAgendaItemCommandSchema,
  AddAttendeeCommandSchema,
  AttendeeStatusSchema,
  CastVoteCommandSchema,
  CreateActionItemCommandSchema,
  CreateBoardMeetingCommandSchema,
  MeetingStatusSchema,
  ProposeResolutionCommandSchema,
  RecordMinutesCommandSchema,
  ResolutionStatusSchema,
  UpdateActionItemCommandSchema,
  UpdateAttendeeStatusCommandSchema,
  UpdateBoardMeetingCommandSchema,
  VoteSchema,
  type BoardMeetingId,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  addAgendaItem,
  addAttendee,
  castVote,
  createActionItem,
  createMeeting,
  getMeetingById,
  listActionItemsByMinute,
  listAgendaItemsByMeeting,
  listAttendeesByMeeting,
  listBoardMeetings,
  listMinutesByMeeting,
  listResolutionsByMeeting,
  listVotesByResolution,
  proposeResolution,
  recordMinutes,
  updateActionItem,
  updateAttendeeStatus,
  updateMeeting,
} from "@afenda/core";
import type {
  BoardMeetingPolicyContext,
  BoardMeetingRow,
  OrgScopedContext,
} from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const MeetingMutationResponseSchema = makeSuccessSchema(
  z.object({ id: z.string().uuid(), meetingNumber: z.string().optional() }),
);

const MeetingRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  meetingNumber: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: MeetingStatusSchema,
  scheduledAt: z.string().datetime({ offset: true }).nullable(),
  duration: z.number().int(),
  location: z.string().nullable(),
  chairId: z.string().uuid(),
  secretaryId: z.string().uuid().nullable(),
  quorumRequired: z.number().int(),
  startedAt: z.string().datetime({ offset: true }).nullable(),
  adjournedAt: z.string().datetime({ offset: true }).nullable(),
  createdByPrincipalId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const MeetingListResponseSchema = makeSuccessSchema(
  z.object({
    data: z.array(MeetingRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

const MeetingDetailResponseSchema = makeSuccessSchema(MeetingRowSchema);

const AgendaItemRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  meetingId: z.string().uuid(),
  sortOrder: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  presenterId: z.string().uuid().nullable(),
  durationMinutes: z.number().int().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const AgendaItemListResponseSchema = makeSuccessSchema(z.array(AgendaItemRowSchema));

const AddAgendaItemResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));

const AttendeeRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  meetingId: z.string().uuid(),
  principalId: z.string().uuid(),
  status: AttendeeStatusSchema,
  role: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const AttendeeListResponseSchema = makeSuccessSchema(z.array(AttendeeRowSchema));

const AddAttendeeResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));

const ResolutionRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  meetingId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: ResolutionStatusSchema,
  proposedById: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const ResolutionVoteRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  resolutionId: z.string().uuid(),
  principalId: z.string().uuid(),
  vote: VoteSchema,
  createdAt: z.string().datetime({ offset: true }),
});

const ResolutionListResponseSchema = makeSuccessSchema(z.array(ResolutionRowSchema));

const ResolutionVoteListResponseSchema = makeSuccessSchema(z.array(ResolutionVoteRowSchema));

const ProposeResolutionResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));

const MinuteRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  meetingId: z.string().uuid(),
  resolutionId: z.string().uuid().nullable(),
  createdByPrincipalId: z.string().uuid(),
  recordedAt: z.string().datetime({ offset: true }),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const MinuteListResponseSchema = makeSuccessSchema(z.array(MinuteRowSchema));

const RecordMinutesResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));

const ActionItemRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  minuteId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  assigneeId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]),
  createdByPrincipalId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  closedAt: z.string().datetime({ offset: true }).nullable(),
});

const ActionItemListResponseSchema = makeSuccessSchema(z.array(ActionItemRowSchema));

const CreateActionItemResponseSchema = makeSuccessSchema(z.object({ id: z.string().uuid() }));

function serializeAgendaItem(row: import("@afenda/core").BoardAgendaItemRow): z.infer<typeof AgendaItemRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    meetingId: row.meetingId,
    sortOrder: row.sortOrder,
    title: row.title,
    description: row.description,
    presenterId: row.presenterId,
    durationMinutes: row.durationMinutes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAttendee(row: import("@afenda/core").BoardMeetingAttendeeRow): z.infer<typeof AttendeeRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    meetingId: row.meetingId,
    principalId: row.principalId,
    status: row.status as z.infer<typeof AttendeeStatusSchema>,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeResolution(row: import("@afenda/core").BoardResolutionRow): z.infer<typeof ResolutionRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    meetingId: row.meetingId,
    title: row.title,
    description: row.description,
    status: row.status as z.infer<typeof ResolutionStatusSchema>,
    proposedById: row.proposedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeResolutionVote(row: import("@afenda/core").BoardResolutionVoteRow): z.infer<typeof ResolutionVoteRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    resolutionId: row.resolutionId,
    principalId: row.principalId,
    vote: row.vote as z.infer<typeof VoteSchema>,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeMinute(row: import("@afenda/core").BoardMinuteRow): z.infer<typeof MinuteRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    meetingId: row.meetingId,
    resolutionId: row.resolutionId,
    createdByPrincipalId: row.createdByPrincipalId,
    recordedAt: row.recordedAt instanceof Date ? row.recordedAt.toISOString() : (row.recordedAt as string),
    content: row.content,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  };
}

function serializeActionItem(row: import("@afenda/core").BoardActionItemRow): z.infer<typeof ActionItemRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    minuteId: row.minuteId,
    title: row.title,
    description: row.description,
    assigneeId: row.assigneeId,
    dueDate: row.dueDate,
    status: row.status,
    createdByPrincipalId: row.createdByPrincipalId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
    closedAt: row.closedAt != null
      ? (row.closedAt instanceof Date ? row.closedAt.toISOString() : (row.closedAt as string))
      : null,
  };
}

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): BoardMeetingPolicyContext {
  return { principalId: req.ctx?.principalId ?? null };
}

function serializeMeeting(row: BoardMeetingRow): z.infer<typeof MeetingRowSchema> {
  return {
    id: row.id,
    orgId: row.orgId,
    meetingNumber: row.meetingNumber,
    title: row.title,
    description: row.description,
    status: row.status as z.infer<typeof MeetingStatusSchema>,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    duration: row.duration,
    location: row.location,
    chairId: row.chairId,
    secretaryId: row.secretaryId,
    quorumRequired: row.quorumRequired,
    startedAt: row.startedAt?.toISOString() ?? null,
    adjournedAt: row.adjournedAt?.toISOString() ?? null,
    createdByPrincipalId: row.createdByPrincipalId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function commBoardMeetingRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/comm-board-meetings",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
          status: MeetingStatusSchema.optional(),
        }),
        response: {
          200: MeetingListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listBoardMeetings(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return reply.status(200).send({
        data: {
          data: page.data.map(serializeMeeting),
          cursor: page.cursor,
          hasMore: page.hasMore,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:id",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: MeetingDetailResponseSchema,
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

      const meeting = await getMeetingById(
        app.db,
        orgId as OrgId,
        req.params.id as BoardMeetingId,
      );
      if (!meeting) {
        return reply.status(404).send({
          error: { code: "COMM_MEETING_NOT_FOUND", message: "Meeting not found" },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: serializeMeeting(meeting),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/create",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateBoardMeetingCommandSchema,
        response: {
          201: MeetingMutationResponseSchema,
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

      const result = await createMeeting(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
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
        data: { id: result.data.id, meetingNumber: result.data.meetingNumber },
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/update",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateBoardMeetingCommandSchema,
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

      const result = await updateMeeting(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_MEETING_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:id/agenda-items",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AgendaItemListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const items = await listAgendaItemsByMeeting(
        app.db,
        orgId as OrgId,
        req.params.id as BoardMeetingId,
      );

      return reply.status(200).send({
        data: items.map(serializeAgendaItem),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/agenda-items/add",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddAgendaItemCommandSchema,
        response: {
          201: AddAgendaItemResponseSchema,
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

      const result = await addAgendaItem(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_MEETING_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:id/attendees",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: AttendeeListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const attendees = await listAttendeesByMeeting(
        app.db,
        orgId as OrgId,
        req.params.id as BoardMeetingId,
      );

      return reply.status(200).send({
        data: attendees.map(serializeAttendee),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/attendees/add",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddAttendeeCommandSchema,
        response: {
          201: AddAttendeeResponseSchema,
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

      const result = await addAttendee(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_MEETING_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/attendees/update-status",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateAttendeeStatusCommandSchema,
        response: {
          200: AddAttendeeResponseSchema,
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

      const result = await updateAttendeeStatus(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_ATTENDEE_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:id/resolutions",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ResolutionListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const resolutions = await listResolutionsByMeeting(
        app.db,
        orgId as OrgId,
        req.params.id as BoardMeetingId,
      );

      return reply.status(200).send({
        data: resolutions.map(serializeResolution),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:meetingId/resolutions/:resolutionId/votes",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({
          meetingId: z.string().uuid(),
          resolutionId: z.string().uuid(),
        }),
        response: {
          200: ResolutionVoteListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const votes = await listVotesByResolution(
        app.db,
        orgId as OrgId,
        req.params.resolutionId as import("@afenda/contracts").BoardResolutionId,
      );

      return reply.status(200).send({
        data: votes.map(serializeResolutionVote),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/resolutions/propose",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ProposeResolutionCommandSchema,
        response: {
          201: ProposeResolutionResponseSchema,
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

      const result = await proposeResolution(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_MEETING_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/resolutions/cast-vote",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CastVoteCommandSchema,
        response: {
          200: ProposeResolutionResponseSchema,
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

      const result = await castVote(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_RESOLUTION_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:id/minutes",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: MinuteListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const minutes = await listMinutesByMeeting(
        app.db,
        orgId as OrgId,
        req.params.id as BoardMeetingId,
      );

      return reply.status(200).send({
        data: minutes.map(serializeMinute),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/minutes/record",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RecordMinutesCommandSchema,
        response: {
          201: RecordMinutesResponseSchema,
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

      const result = await recordMinutes(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_MEETING_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/comm-board-meetings/:meetingId/minutes/:minuteId/action-items",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({
          meetingId: z.string().uuid(),
          minuteId: z.string().uuid(),
        }),
        response: {
          200: ActionItemListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const items = await listActionItemsByMinute(
        app.db,
        orgId as OrgId,
        req.params.minuteId as import("@afenda/contracts").BoardMinuteId,
      );

      return reply.status(200).send({
        data: items.map(serializeActionItem),
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/action-items/create",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateActionItemCommandSchema,
        response: {
          201: CreateActionItemResponseSchema,
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

      const result = await createActionItem(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_MINUTE_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  typed.post(
    "/commands/comm-board-meetings/action-items/update",
    {
      schema: {
        tags: ["COMM Boardroom"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateActionItemCommandSchema,
        response: {
          200: CreateActionItemResponseSchema,
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

      const result = await updateActionItem(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_ACTION_ITEM_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );
}
