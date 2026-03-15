import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateTaskCommandSchema,
  UpdateTaskCommandSchema,
  AssignTaskCommandSchema,
  BulkAssignTasksCommandSchema,
  BulkTransitionTaskStatusCommandSchema,
  TransitionTaskStatusCommandSchema,
  CompleteTaskCommandSchema,
  ArchiveTaskCommandSchema,
  AddTaskChecklistCommandSchema,
  ToggleTaskChecklistItemCommandSchema,
  RemoveTaskChecklistItemCommandSchema,
  LogTaskTimeEntryCommandSchema,
  TaskStatusSchema,
  type CommProjectId,
  type CorrelationId,
  type OrgId,
  type PrincipalId,
  type CommTaskId,
} from "@afenda/contracts";
import {
  createTask,
  updateTask,
  assignTask,
  bulkAssignTasks,
  transitionTaskStatus,
  bulkTransitionTaskStatus,
  completeTask,
  archiveTask,
  addTaskChecklist,
  toggleTaskChecklistItem,
  removeTaskChecklistItem,
  logTaskTimeEntry,
  getTaskById,
  listTasks,
  listTaskChecklistItems,
  listTaskTimeEntries,
} from "@afenda/core";
import type { CommTaskPolicyContext, OrgScopedContext } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../helpers/responses.js";
import { serializeDate } from "../../helpers/dates.js";
import { buildOrgScopedContext, buildMinimalPolicyContext } from "../../helpers/context.js";

const TaskMutationResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    taskNumber: z.string().optional(),
    status: z.string().optional(),
  }),
);

const BulkTaskMutationResponseSchema = makeSuccessSchema(
  z.object({
    processedCount: z.number().int().nonnegative(),
    status: z.string().optional(),
  }),
);

const TaskChecklistMutationResponseSchema = makeSuccessSchema(
  z.object({
    taskId: z.string().uuid().optional(),
    addedCount: z.number().int().optional(),
    checklistItemId: z.string().uuid().optional(),
    checked: z.boolean().optional(),
  }),
);

const TaskTimeMutationResponseSchema = makeSuccessSchema(
  z.object({
    timeEntryId: z.string().uuid(),
  }),
);

const TaskSchema = z.object({
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
});

const TaskListResponseSchema = makeSuccessSchema(z.array(TaskSchema));
const TaskDetailResponseSchema = makeSuccessSchema(TaskSchema);
const TaskChecklistResponseSchema = makeSuccessSchema(
  z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      taskId: z.string().uuid(),
      text: z.string(),
      isChecked: z.boolean(),
      checkedAt: z.string().datetime().nullable(),
      checkedByPrincipalId: z.string().uuid().nullable(),
      sortOrder: z.number().int(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
);

const TaskTimeEntryResponseSchema = makeSuccessSchema(
  z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      taskId: z.string().uuid(),
      principalId: z.string().uuid(),
      minutes: z.number().int(),
      entryDate: z.string(),
      description: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
);

// Context builders now in helpers/context.ts

function formatTaskRow(row: {
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

export async function commTaskRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/commands/create-task",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateTaskCommandSchema,
        response: {
          201: TaskMutationResponseSchema,
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

      const result = await createTask(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
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
    "/commands/update-task",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateTaskCommandSchema,
        response: {
          200: TaskMutationResponseSchema,
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

      const result = await updateTask(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/assign-task",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AssignTaskCommandSchema,
        response: {
          200: TaskMutationResponseSchema,
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

      const result = await assignTask(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/bulk-assign-tasks",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BulkAssignTasksCommandSchema,
        response: {
          200: BulkTaskMutationResponseSchema,
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

      const result = await bulkAssignTasks(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/transition-task-status",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: TransitionTaskStatusCommandSchema,
        response: {
          200: TaskMutationResponseSchema,
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

      const result = await transitionTaskStatus(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/bulk-transition-task-status",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BulkTransitionTaskStatusCommandSchema,
        response: {
          200: BulkTaskMutationResponseSchema,
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

      const result = await bulkTransitionTaskStatus(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/complete-task",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CompleteTaskCommandSchema,
        response: {
          200: TaskMutationResponseSchema,
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

      const result = await completeTask(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/archive-task",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ArchiveTaskCommandSchema,
        response: {
          200: TaskMutationResponseSchema,
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

      const result = await archiveTask(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/add-task-checklist",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddTaskChecklistCommandSchema,
        response: {
          200: TaskChecklistMutationResponseSchema,
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

      const result = await addTaskChecklist(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/commands/toggle-task-checklist-item",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ToggleTaskChecklistItemCommandSchema,
        response: {
          200: TaskChecklistMutationResponseSchema,
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

      const result = await toggleTaskChecklistItem(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_CHECKLIST_ITEM_NOT_FOUND" ? 404 : 400;
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
    "/commands/remove-task-checklist-item",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RemoveTaskChecklistItemCommandSchema,
        response: {
          200: TaskChecklistMutationResponseSchema,
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

      const result = await removeTaskChecklistItem(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_CHECKLIST_ITEM_NOT_FOUND" ? 404 : 400;
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
    "/commands/log-task-time-entry",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: LogTaskTimeEntryCommandSchema,
        response: {
          200: TaskTimeMutationResponseSchema,
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

      const result = await logTaskTimeEntry(
        app.db,
        buildOrgScopedContext(orgId),
        buildMinimalPolicyContext(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "COMM_TASK_NOT_FOUND" ? 404 : 400;
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
    "/tasks",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.array(TaskStatusSchema).optional(),
          assigneeId: z.string().uuid().optional(),
          projectId: z.string().uuid().optional(),
          limit: z.coerce.number().int().positive().max(500).optional(),
        }),
        response: {
          200: TaskListResponseSchema,
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

      const rows = await listTasks(app.db, {
        orgId,
        statuses: req.query.status,
        assigneeId: req.query.assigneeId as PrincipalId | undefined,
        projectId: req.query.projectId as CommProjectId | undefined,
        limit: req.query.limit,
      });

      return reply.status(200).send({
        data: rows.map(formatTaskRow),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/tasks/:taskId",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ taskId: z.string().uuid() }),
        response: {
          200: TaskDetailResponseSchema,
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

      const row = await getTaskById(app.db, orgId, req.params.taskId as CommTaskId);
      if (!row) {
        return reply.status(404).send({
          error: {
            code: "COMM_TASK_NOT_FOUND",
            message: "Task not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: formatTaskRow(row),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/tasks/:taskId/checklist",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ taskId: z.string().uuid() }),
        response: {
          200: TaskChecklistResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listTaskChecklistItems(app.db, orgId, req.params.taskId as CommTaskId);
      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          checkedAt: serializeDate(row.checkedAt),
          createdAt: serializeDate(row.createdAt)!,
          updatedAt: serializeDate(row.updatedAt)!,
        })),
        correlationId: req.correlationId,
      });
    },
  );

  typed.get(
    "/tasks/:taskId/time-entries",
    {
      schema: {
        tags: ["COMM Tasks"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ taskId: z.string().uuid() }),
        response: {
          200: TaskTimeEntryResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listTaskTimeEntries(app.db, orgId, req.params.taskId as CommTaskId);
      return reply.status(200).send({
        data: rows.map((row) => ({
          ...row,
          createdAt: serializeDate(row.createdAt)!,
        })),
        correlationId: req.correlationId,
      });
    },
  );
}
