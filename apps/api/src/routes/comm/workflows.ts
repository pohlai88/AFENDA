import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateWorkflowCommandSchema,
  UpdateWorkflowCommandSchema,
  ChangeWorkflowStatusCommandSchema,
  DeleteWorkflowCommandSchema,
  ExecuteWorkflowCommandSchema,
  WorkflowStatusValues,
  WorkflowRunStatusValues,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
  type WorkflowStatus,
  type WorkflowRunStatus,
  type CommWorkflowId,
  type CommWorkflowRunId,
} from "@afenda/contracts";
import {
  createWorkflow,
  updateWorkflow,
  changeWorkflowStatus,
  deleteWorkflow,
  executeWorkflow,
  getWorkflowById,
  listWorkflows,
  listWorkflowRuns,
  getWorkflowRunById,
} from "@afenda/core";
import type { WorkflowPolicyContext, OrgScopedContext } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../helpers/responses.js";

const WorkflowStatusSchema = z.enum(WorkflowStatusValues);
const WorkflowRunStatusSchema = z.enum(WorkflowRunStatusValues);

const WorkflowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: WorkflowStatusSchema,
  trigger: z.object({
    type: z.string(),
    conditions: z
      .array(
        z.object({
          field: z.string(),
          operator: z.string(),
          value: z.unknown().optional(),
        }),
      )
      .optional(),
  }),
  actions: z.array(
    z.object({
      type: z.string(),
      config: z.record(z.string(), z.unknown()),
    }),
  ),
  createdByPrincipalId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastTriggeredAt: z.string().datetime().nullable(),
  runCount: z.number().int().nonnegative(),
});

const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: WorkflowRunStatusSchema,
  triggerEventId: z.string().uuid().nullable(),
  triggerPayload: z.record(z.string(), z.unknown()),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  error: z.string().nullable(),
  executedActions: z.array(
    z.object({
      actionType: z.string(),
      status: z.string(),
      result: z.unknown().optional(),
      error: z.string().optional(),
    }),
  ),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const WorkflowMutationResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
  }),
);

const CreateWorkflowApiBodySchema = CreateWorkflowCommandSchema.omit({
  orgId: true,
  principalId: true,
});

const UpdateWorkflowApiBodySchema = UpdateWorkflowCommandSchema.omit({
  orgId: true,
  principalId: true,
});

const ChangeWorkflowStatusApiBodySchema = ChangeWorkflowStatusCommandSchema.omit({
  orgId: true,
  principalId: true,
});

const DeleteWorkflowApiBodySchema = DeleteWorkflowCommandSchema.omit({
  orgId: true,
  principalId: true,
});

const ExecuteWorkflowApiBodySchema = ExecuteWorkflowCommandSchema.omit({
  orgId: true,
});

const WorkflowExecutionResponseSchema = makeSuccessSchema(
  z.object({
    runId: z.string().uuid(),
  }),
);

const WorkflowListResponseSchema = makeSuccessSchema(z.array(WorkflowSchema));
const WorkflowDetailResponseSchema = makeSuccessSchema(WorkflowSchema);
const WorkflowRunListResponseSchema = makeSuccessSchema(z.array(WorkflowRunSchema));
const WorkflowRunDetailResponseSchema = makeSuccessSchema(WorkflowRunSchema);

const WORKFLOW_READ_PERMISSION = "comm.workflow.read";
const WORKFLOW_CREATE_PERMISSION = "comm.workflow.create";
const WORKFLOW_UPDATE_PERMISSION = "comm.workflow.update";
const WORKFLOW_EXECUTE_PERMISSION = "comm.workflow.execute";

function canReadWorkflow(permissionsSet: ReadonlySet<string>): boolean {
  return (
    permissionsSet.has(WORKFLOW_READ_PERMISSION) ||
    permissionsSet.has(WORKFLOW_UPDATE_PERMISSION) ||
    permissionsSet.has(WORKFLOW_CREATE_PERMISSION)
  );
}

function denyWorkflowPermission(req: FastifyRequest, reply: FastifyReply, permission: string) {
  return reply.status(403 as const).send({
    error: {
      code: "SHARED_FORBIDDEN",
      message: `Requires ${permission} permission`,
    },
    correlationId: req.correlationId,
  });
}

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): WorkflowPolicyContext {
  return { principalId: req.ctx?.principalId ?? null };
}

function formatWorkflowRow(row: {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  trigger: {
    type: string;
    conditions?: Array<{ field: string; operator: string; value?: unknown }>;
  };
  actions: Array<{ type: string; config: Record<string, unknown> }>;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt: Date | null;
  runCount: number;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastTriggeredAt: row.lastTriggeredAt?.toISOString() ?? null,
  };
}

function formatWorkflowRunRow(row: {
  id: string;
  orgId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  triggerEventId: string | null;
  triggerPayload: Record<string, unknown>;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  executedActions: Array<{
    actionType: string;
    status: string;
    result?: unknown;
    error?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function commWorkflowRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/commands/create-workflow",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateWorkflowApiBodySchema,
        response: {
          201: WorkflowMutationResponseSchema,
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
      if (!auth.permissionsSet.has(WORKFLOW_CREATE_PERMISSION)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_CREATE_PERMISSION);
      }

      const result = await createWorkflow(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
          principalId: auth.principalId,
        },
      );

      if (!result.ok) {
        return reply.status(400).send({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/update-workflow",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateWorkflowApiBodySchema,
        response: {
          200: WorkflowMutationResponseSchema,
          400: ApiErrorResponseSchema,
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
      if (!auth.permissionsSet.has(WORKFLOW_UPDATE_PERMISSION)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_UPDATE_PERMISSION);
      }

      const result = await updateWorkflow(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
          principalId: auth.principalId,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_WORKFLOW_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/change-workflow-status",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ChangeWorkflowStatusApiBodySchema,
        response: {
          200: WorkflowMutationResponseSchema,
          400: ApiErrorResponseSchema,
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
      if (!auth.permissionsSet.has(WORKFLOW_UPDATE_PERMISSION)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_UPDATE_PERMISSION);
      }

      const result = await changeWorkflowStatus(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
          principalId: auth.principalId,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_WORKFLOW_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/delete-workflow",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeleteWorkflowApiBodySchema,
        response: {
          200: WorkflowMutationResponseSchema,
          400: ApiErrorResponseSchema,
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
      if (!auth.permissionsSet.has(WORKFLOW_UPDATE_PERMISSION)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_UPDATE_PERMISSION);
      }

      const result = await deleteWorkflow(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
          principalId: auth.principalId,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_WORKFLOW_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.post(
    "/commands/execute-workflow",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ExecuteWorkflowApiBodySchema,
        response: {
          200: WorkflowExecutionResponseSchema,
          400: ApiErrorResponseSchema,
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
      if (!auth.permissionsSet.has(WORKFLOW_EXECUTE_PERMISSION)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_EXECUTE_PERMISSION);
      }

      const result = await executeWorkflow(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
        },
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_WORKFLOW_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  typed.get(
    "/workflows",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z
          .object({
            status: WorkflowStatusSchema.optional(),
          })
          .optional(),
        response: {
          200: WorkflowListResponseSchema,
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
      if (!canReadWorkflow(auth.permissionsSet)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_READ_PERMISSION);
      }

      const rows = await listWorkflows(app.db, orgId as OrgId, req.query);
      return reply.status(200).send({
        data: rows.map(formatWorkflowRow),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/workflows/:id",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: WorkflowDetailResponseSchema,
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
      if (!canReadWorkflow(auth.permissionsSet)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_READ_PERMISSION);
      }

      const row = await getWorkflowById(app.db, orgId as OrgId, req.params.id as CommWorkflowId);

      if (!row) {
        return reply.status(404).send({
          error: {
            code: "COMM_WORKFLOW_NOT_FOUND",
            message: "Workflow not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: formatWorkflowRow(row),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/workflows/:id/runs",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        querystring: z
          .object({
            status: WorkflowRunStatusSchema.optional(),
          })
          .optional(),
        response: {
          200: WorkflowRunListResponseSchema,
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
      if (!canReadWorkflow(auth.permissionsSet)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_READ_PERMISSION);
      }

      const rows = await listWorkflowRuns(
        app.db,
        orgId as OrgId,
        req.params.id as CommWorkflowId,
        req.query,
      );
      return reply.status(200).send({
        data: rows.map(formatWorkflowRunRow),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/workflow-runs/:runId",
    {
      schema: {
        tags: ["COMM Workflows"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ runId: z.string().uuid() }),
        response: {
          200: WorkflowRunDetailResponseSchema,
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
      if (!canReadWorkflow(auth.permissionsSet)) {
        return denyWorkflowPermission(req, reply, WORKFLOW_READ_PERMISSION);
      }

      const row = await getWorkflowRunById(
        app.db,
        orgId as OrgId,
        req.params.runId as CommWorkflowRunId,
      );

      if (!row) {
        return reply.status(404).send({
          error: {
            code: "COMM_WORKFLOW_RUN_NOT_FOUND",
            message: "Workflow run not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: formatWorkflowRunRow(row),
        correlationId: req.correlationId,
      });
    },
  );
}
