import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateApprovalRequestCommandSchema,
  ApproveStepCommandSchema,
  RejectStepCommandSchema,
  DelegateStepCommandSchema,
  EscalateApprovalCommandSchema,
  WithdrawApprovalCommandSchema,
  CreateApprovalPolicyCommandSchema,
  SetDelegationCommandSchema,
  ApprovalStatusSchema,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
  type ApprovalRequestId,
} from "@afenda/contracts";
import {
  createApprovalRequest,
  approveStep,
  rejectStep,
  delegateStep,
  escalateApproval,
  withdrawApproval,
  createApprovalPolicy,
  setDelegation,
  listApprovals,
  getApprovalById,
  listApprovalSteps,
  listPendingForPrincipal,
  listPolicies,
  listActiveDelegations,
  listApprovalStatusHistory,
} from "@afenda/core";
import type { CommApprovalPolicyContext, OrgScopedContext } from "@afenda/core";
import type { ApprovalRequestRow, ApprovalStepRow, ApprovalPolicyRow } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../helpers/responses.js";
import { serializeDate } from "../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../helpers/context.js";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ApprovalMutationResponseSchema = makeSuccessSchema(
  z.object({ id: z.string().uuid(), approvalNumber: z.string().optional() }),
);

const ApprovalRequestRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  approvalNumber: z.string(),
  title: z.string(),
  sourceEntityType: z.string(),
  sourceEntityId: z.string(),
  requestedByPrincipalId: z.string().uuid(),
  status: ApprovalStatusSchema,
  currentStepIndex: z.number().int(),
  totalSteps: z.number().int(),
  urgency: z.string(),
  dueDate: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedByPrincipalId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ApprovalStepRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
  stepIndex: z.number().int(),
  label: z.string().nullable(),
  assigneeId: z.string().uuid(),
  delegatedToId: z.string().uuid().nullable(),
  status: z.string(),
  comment: z.string().nullable(),
  actedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ApprovalPolicyRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  sourceEntityType: z.string(),
  autoApproveBelowAmount: z.number().int().nullable(),
  escalationAfterHours: z.number().int().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ApprovalListResponseSchema = makeSuccessSchema(
  z.object({
    data: z.array(ApprovalRequestRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

const ApprovalDetailResponseSchema = makeSuccessSchema(
  z.object({
    request: ApprovalRequestRowSchema,
    steps: z.array(ApprovalStepRowSchema),
    history: z.array(
      z.object({
        id: z.string().uuid(),
        fromStatus: z.string(),
        toStatus: z.string(),
        changedByPrincipalId: z.string().uuid().nullable(),
        reason: z.string().nullable(),
        occurredAt: z.string().datetime(),
      }),
    ),
  }),
);

const ApprovalPolicyListResponseSchema = makeSuccessSchema(
  z.object({
    data: z.array(ApprovalPolicyRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function serializeApproval(row: ApprovalRequestRow) {
  return {
    ...row,
    resolvedAt: serializeDate(row.resolvedAt),
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

function serializeStep(row: ApprovalStepRow) {
  return {
    ...row,
    actedAt: serializeDate(row.actedAt),
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function commApprovalRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  typed.get(
    "/approvals",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
          status: ApprovalStatusSchema.optional(),
          requestedByMe: z.coerce.boolean().optional(),
          sourceEntityType: z.string().optional(),
        }),
        response: {
          200: ApprovalListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listApprovals(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
        requestedByPrincipalId: req.query.requestedByMe
          ? (req.ctx?.principalId as PrincipalId)
          : undefined,
        sourceEntityType: req.query.sourceEntityType,
      });

      return reply.status(200).send({
        data: {
          data: page.data.map((r) => serializeApproval(r)),
          cursor: page.cursor,
          hasMore: page.hasMore,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/approvals/pending",
    {
      schema: {
        tags: ["COMM Approvals"],
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
        }),
        response: {
          200: ApprovalListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listPendingForPrincipal(
        app.db,
        orgId as OrgId,
        req.ctx!.principalId as PrincipalId,
        { cursor: req.query.cursor, limit: req.query.limit },
      );

      return reply.status(200).send({
        data: {
          data: page.data.map((r) => serializeApproval(r)),
          cursor: page.cursor,
          hasMore: page.hasMore,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/approvals/policies",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
        }),
        response: {
          200: ApprovalPolicyListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const page = await listPolicies(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return reply.status(200).send({
        data: {
          data: page.data.map((r) => ({
            ...r,
            createdAt: r.createdAt instanceof Date ? serializeDate(r.createdAt)! : r.createdAt,
            updatedAt: r.updatedAt instanceof Date ? serializeDate(r.updatedAt)! : r.updatedAt,
          })),
          cursor: page.cursor,
          hasMore: page.hasMore,
        },
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/approvals/:id",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ApprovalDetailResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const request = await getApprovalById(
        app.db,
        orgId as OrgId,
        req.params.id as ApprovalRequestId,
      );

      if (!request) {
        return reply.status(404).send({
          error: { code: "COMM_APPROVAL_NOT_FOUND", message: "Approval request not found" },
          correlationId: req.correlationId,
        });
      }

      const [steps, history] = await Promise.all([
        listApprovalSteps(app.db, orgId as OrgId, req.params.id as ApprovalRequestId),
        listApprovalStatusHistory(app.db, orgId as OrgId, req.params.id as ApprovalRequestId),
      ]);

      return reply.status(200).send({
        data: {
          request: serializeApproval(request),
          steps: steps.map((s) => serializeStep(s)),
          history: history.map((h) => ({
            id: h.id,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            changedByPrincipalId: h.changedByPrincipalId,
            reason: h.reason,
            occurredAt: h.occurredAt instanceof Date ? serializeDate(h.occurredAt)! : h.occurredAt,
          })),
        },
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ Commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  typed.post(
    "/commands/create-approval-request",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateApprovalRequestCommandSchema,
        response: {
          201: ApprovalMutationResponseSchema,
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

      const result = await createApprovalRequest(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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
    "/commands/approve-step",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApproveStepCommandSchema,
        response: {
          200: ApprovalMutationResponseSchema,
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

      const result = await approveStep(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_APPROVAL_NOT_FOUND" ? 404 : 400;
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
    "/commands/reject-step",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RejectStepCommandSchema,
        response: {
          200: ApprovalMutationResponseSchema,
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

      const result = await rejectStep(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_APPROVAL_NOT_FOUND" ? 404 : 400;
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
    "/commands/delegate-step",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DelegateStepCommandSchema,
        response: {
          200: ApprovalMutationResponseSchema,
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

      const result = await delegateStep(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_APPROVAL_NOT_FOUND" ? 404 : 400;
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
    "/commands/escalate-approval",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: EscalateApprovalCommandSchema,
        response: {
          200: ApprovalMutationResponseSchema,
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

      const result = await escalateApproval(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_APPROVAL_NOT_FOUND" ? 404 : 400;
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
    "/commands/withdraw-approval",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: WithdrawApprovalCommandSchema,
        response: {
          200: ApprovalMutationResponseSchema,
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

      const result = await withdrawApproval(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_APPROVAL_NOT_FOUND" ? 404 : 400;
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
    "/commands/create-approval-policy",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateApprovalPolicyCommandSchema,
        response: {
          201: ApprovalMutationResponseSchema,
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

      const result = await createApprovalPolicy(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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
    "/commands/set-approval-delegation",
    {
      schema: {
        tags: ["COMM Approvals"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SetDelegationCommandSchema,
        response: {
          201: ApprovalMutationResponseSchema,
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

      const result = await setDelegation(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
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
}
