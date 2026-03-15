import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AddProjectMemberCommandSchema,
  ArchiveProjectCommandSchema,
  CompleteProjectMilestoneCommandSchema,
  CreateProjectCommandSchema,
  CreateProjectMilestoneCommandSchema,
  ProjectMemberRoleSchema,
  ProjectMilestoneStatusSchema,
  ProjectStatusSchema,
  ProjectVisibilitySchema,
  RemoveProjectMemberCommandSchema,
  TaskStatusSchema,
  TransitionProjectStatusCommandSchema,
  UpdateProjectCommandSchema,
  type CommProjectId,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  addProjectMember,
  archiveProject,
  completeProjectMilestone,
  createProject,
  createProjectMilestone,
  getProjectById,
  listTasks,
  listProjectMembers,
  listProjectMilestones,
  listProjectPhases,
  listProjects,
  removeProjectMember,
  transitionProjectStatus,
  updateProject,
} from "@afenda/core";
import type { ProjectRow } from "@afenda/core";
import type { CommProjectPolicyContext, OrgScopedContext } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../helpers/responses.js";
import { serializeDate } from "../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../helpers/context.js";

const ProjectSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectNumber: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusSchema,
  visibility: ProjectVisibilitySchema,
  ownerId: z.string().uuid(),
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  completedAt: z.string().datetime().nullable(),
  color: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProjectMemberSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  principalId: z.string().uuid(),
  role: ProjectMemberRoleSchema,
  joinedAt: z.string().datetime(),
});

const ProjectMilestoneSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  milestoneNumber: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectMilestoneStatusSchema,
  targetDate: z.string(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProjectPhaseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  sequenceOrder: z.number().int(),
  startDate: z.string().nullable(),
  targetEndDate: z.string().nullable(),
  actualEndDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ProjectListResponseSchema = makeSuccessSchema(z.array(ProjectSchema));
const ProjectDetailResponseSchema = makeSuccessSchema(ProjectSchema);
const ProjectMembersResponseSchema = makeSuccessSchema(z.array(ProjectMemberSchema));
const ProjectMilestonesResponseSchema = makeSuccessSchema(z.array(ProjectMilestoneSchema));
const ProjectPhasesResponseSchema = makeSuccessSchema(z.array(ProjectPhaseSchema));
const ProjectTasksResponseSchema = makeSuccessSchema(
  z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      projectId: z.string().uuid().nullable(),
      parentTaskId: z.string().uuid().nullable(),
      taskNumber: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string(),
      priority: z.string(),
      taskType: z.string(),
      assigneeId: z.string().uuid().nullable(),
      reporterId: z.string().uuid(),
      dueDate: z.string().nullable(),
      startDate: z.string().nullable(),
      estimateMinutes: z.number().int().nullable(),
      actualMinutes: z.number().int().nullable(),
      completedAt: z.string().datetime().nullable(),
      completedByPrincipalId: z.string().uuid().nullable(),
      sortOrder: z.number().int(),
      contextEntityType: z.string().nullable(),
      contextEntityId: z.string().nullable(),
      slaBreachAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
);

const ProjectMutationResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    projectNumber: z.string().optional(),
    status: ProjectStatusSchema.optional(),
  }),
);

const ProjectMemberMutationResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    principalId: z.string().uuid(),
  }),
);

const ProjectMilestoneMutationResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    milestoneNumber: z.string().optional(),
    status: ProjectMilestoneStatusSchema.optional(),
  }),
);

function formatProjectRow(row: ProjectRow) {
  return {
    ...row,
    completedAt: serializeDate(row.completedAt),
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

function formatProjectTaskRow(row: {
  id: string;
  orgId: string;
  projectId: string | null;
  parentTaskId: string | null;
  taskNumber: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  taskType: string;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  startDate: string | null;
  estimateMinutes: number | null;
  actualMinutes: number | null;
  completedAt: Date | null;
  completedByPrincipalId: string | null;
  sortOrder: number;
  contextEntityType: string | null;
  contextEntityId: string | null;
  slaBreachAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    completedAt: serializeDate(row.completedAt),
    slaBreachAt: serializeDate(row.slaBreachAt),
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

export async function commProjectRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/commands/create-project",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateProjectCommandSchema,
        response: {
          201: ProjectMutationResponseSchema,
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

      const result = await createProject(
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
    "/commands/update-project",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateProjectCommandSchema,
        response: {
          200: ProjectMutationResponseSchema,
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

      const result = await updateProject(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_PROJECT_NOT_FOUND" ? 404 : 400;
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
    "/commands/transition-project-status",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: TransitionProjectStatusCommandSchema,
        response: {
          200: ProjectMutationResponseSchema,
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

      const result = await transitionProjectStatus(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_PROJECT_NOT_FOUND" ? 404 : 400;
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
    "/commands/archive-project",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ArchiveProjectCommandSchema,
        response: {
          200: ProjectMutationResponseSchema,
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

      const result = await archiveProject(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_PROJECT_NOT_FOUND" ? 404 : 400;
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
    "/commands/add-project-member",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddProjectMemberCommandSchema,
        response: {
          200: ProjectMemberMutationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await addProjectMember(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "COMM_PROJECT_NOT_FOUND"
            ? 404
            : result.error.code === "COMM_PROJECT_MEMBER_ALREADY_EXISTS"
              ? 409
              : 400;

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
    "/commands/remove-project-member",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RemoveProjectMemberCommandSchema,
        response: {
          200: ProjectMemberMutationResponseSchema,
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

      const result = await removeProjectMember(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_PROJECT_MEMBER_NOT_FOUND" ? 404 : 400;
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
    "/commands/create-project-milestone",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateProjectMilestoneCommandSchema,
        response: {
          201: ProjectMilestoneMutationResponseSchema,
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

      const result = await createProjectMilestone(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_PROJECT_NOT_FOUND" ? 404 : 400;
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
    "/commands/complete-project-milestone",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CompleteProjectMilestoneCommandSchema,
        response: {
          200: ProjectMilestoneMutationResponseSchema,
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

      const result = await completeProjectMilestone(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_PROJECT_MILESTONE_NOT_FOUND" ? 404 : 400;
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
    "/projects",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.union([ProjectStatusSchema, z.array(ProjectStatusSchema)]).optional(),
          ownerId: z.string().uuid().optional(),
          visibility: ProjectVisibilitySchema.optional(),
          limit: z.coerce.number().int().positive().max(200).optional(),
        }),
        response: {
          200: ProjectListResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const statuses = req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined;

      const rows = await listProjects(app.db, {
        orgId,
        statuses,
        ownerId: req.query.ownerId as PrincipalId | undefined,
        visibility: req.query.visibility,
        limit: req.query.limit,
      });

      return reply.status(200).send({
        data: rows.map((row) => formatProjectRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/projects/:id",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ProjectDetailResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const row = await getProjectById(app.db, orgId as OrgId, req.params.id as CommProjectId);
      if (!row) {
        return reply.status(404).send({
          error: {
            code: "COMM_PROJECT_NOT_FOUND",
            message: "Project not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: formatProjectRow(row),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/projects/:id/members",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ProjectMembersResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const rows = await listProjectMembers(app.db, orgId, req.params.id as CommProjectId);

      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          joinedAt: serializeDate(row.joinedAt)!,
        })),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/projects/:id/tasks",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          status: z.union([TaskStatusSchema, z.array(TaskStatusSchema)]).optional(),
          assigneeId: z.string().uuid().optional(),
          limit: z.coerce.number().int().positive().max(500).optional(),
        }),
        response: {
          200: ProjectTasksResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const project = await getProjectById(app.db, orgId as OrgId, req.params.id as CommProjectId);
      if (!project) {
        return reply.status(404).send({
          error: {
            code: "COMM_PROJECT_NOT_FOUND",
            message: "Project not found",
          },
          correlationId: req.correlationId,
        });
      }

      const statuses = req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined;

      const rows = await listTasks(app.db, {
        orgId,
        projectId: req.params.id as CommProjectId,
        statuses,
        assigneeId: req.query.assigneeId as PrincipalId | undefined,
        limit: req.query.limit,
      });

      return reply.status(200).send({
        data: rows.map((row) => formatProjectTaskRow(row)),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/projects/:id/milestones",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ProjectMilestonesResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const rows = await listProjectMilestones(app.db, orgId, req.params.id as CommProjectId);

      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          completedAt: serializeDate(row.completedAt),
          createdAt: serializeDate(row.createdAt)!,
          updatedAt: serializeDate(row.updatedAt)!,
        })),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/projects/:id/phases",
    {
      schema: {
        tags: ["COMM Projects"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ProjectPhasesResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const rows = await listProjectPhases(app.db, orgId, req.params.id as CommProjectId);

      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          actualEndDate: serializeDate(row.actualEndDate),
          createdAt: serializeDate(row.createdAt)!,
          updatedAt: serializeDate(row.updatedAt)!,
        })),
        correlationId: req.correlationId,
      });
    },
  );
}
