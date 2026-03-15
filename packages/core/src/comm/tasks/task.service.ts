import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { commTask, commTaskChecklistItem, commTaskTimeEntry, outboxEvent } from "@afenda/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  CorrelationId,
  EntityId,
  PrincipalId,
  CommTaskId,
  CreateTaskCommand,
  UpdateTaskCommand,
  AssignTaskCommand,
  BulkAssignTasksCommand,
  BulkTransitionTaskStatusCommand,
  TransitionTaskStatusCommand,
  CompleteTaskCommand,
  ArchiveTaskCommand,
  AddTaskChecklistCommand,
  ToggleTaskChecklistItemCommand,
  RemoveTaskChecklistItemCommand,
  LogTaskTimeEntryCommand,
  TaskStatus,
  TaskChecklistItemId,
  TaskTimeEntryId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";

export interface CommTaskPolicyContext {
  principalId?: PrincipalId | null;
}

export type CommTaskServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type CommTaskServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommTaskServiceError };

const TASK_STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ["open", "archived", "cancelled"],
  open: ["in_progress", "blocked", "done", "cancelled", "archived"],
  in_progress: ["review", "blocked", "done", "cancelled", "archived"],
  review: ["in_progress", "done", "blocked", "cancelled", "archived"],
  blocked: ["open", "in_progress", "cancelled", "archived"],
  done: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

function buildTaskNumber(): string {
  return `TASK-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function loadTaskStatus(
  db: DbClient,
  orgId: string,
  taskId: CommTaskId,
): Promise<{ id: string; status: TaskStatus } | null> {
  const [row] = await db
    .select({ id: commTask.id, status: commTask.status })
    .from(commTask)
    .where(and(eq(commTask.orgId, orgId), eq(commTask.id, taskId)));

  if (!row) return null;
  return { id: row.id, status: row.status as TaskStatus };
}

async function loadTaskStatuses(
  db: DbClient,
  orgId: string,
  taskIds: readonly CommTaskId[],
): Promise<Array<{ id: string; status: TaskStatus }>> {
  if (taskIds.length === 0) return [];

  const rows = await db
    .select({ id: commTask.id, status: commTask.status })
    .from(commTask)
    .where(and(eq(commTask.orgId, orgId), inArray(commTask.id, [...taskIds])));

  return rows.map((row) => ({ id: row.id, status: row.status as TaskStatus }));
}

export async function createTask(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: CreateTaskCommand,
): Promise<CommTaskServiceResult<{ id: CommTaskId; taskNumber: string }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }
  const principalId = policyCtx.principalId;

  if (params.parentTaskId) {
    const parent = await loadTaskStatus(db, orgId, params.parentTaskId);
    if (!parent) {
      return {
        ok: false,
        error: {
          code: "COMM_TASK_PARENT_NOT_FOUND",
          message: "Parent task not found",
          meta: { parentTaskId: params.parentTaskId },
        },
      };
    }
  }

  const taskNumber = buildTaskNumber();
  const auditEntry = {
    actorPrincipalId: principalId,
    action: "task.created" as const,
    entityType: "task" as const,
    correlationId,
    details: {
      taskNumber,
      title: params.title,
      status: params.priority ?? "none",
    },
  };

  const task = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(commTask)
      .values({
        orgId,
        projectId: params.projectId ?? null,
        parentTaskId: params.parentTaskId ?? null,
        taskNumber,
        title: params.title,
        description: params.description ?? null,
        status: "draft",
        priority: params.priority ?? "none",
        taskType: params.taskType ?? "task",
        assigneeId: params.assigneeId ?? null,
        reporterId: principalId,
        dueDate: params.dueDate ?? null,
        startDate: params.startDate ?? null,
        estimateMinutes: params.estimateMinutes ?? null,
        sortOrder: 0,
        contextEntityType: params.contextEntityType ?? null,
        contextEntityId: params.contextEntityId ?? null,
      })
      .returning({ id: commTask.id, taskNumber: commTask.taskNumber });

    if (!row) throw new Error("Failed to create task");

    await tx.insert(outboxEvent).values({
      orgId,
      type: "COMM.TASK_CREATED",
      version: "1",
      correlationId,
      payload: {
        taskId: row.id,
        taskNumber: row.taskNumber,
        title: params.title,
      },
    });

    return row;
  });

  return {
    ok: true,
    data: {
      id: task.id as CommTaskId,
      taskNumber: task.taskNumber,
    },
  };
}

export async function updateTask(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: UpdateTaskCommand,
): Promise<CommTaskServiceResult<{ id: CommTaskId }>> {
  const orgId = ctx.activeContext.orgId;

  const existing = await loadTaskStatus(db, orgId, params.taskId);
  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_TASK_NOT_FOUND",
        message: "Task not found",
        meta: { taskId: params.taskId },
      },
    };
  }

  const updateSet: {
    title?: string;
    description?: string | null;
    priority?: UpdateTaskCommand["priority"];
    taskType?: UpdateTaskCommand["taskType"];
    dueDate?: string | null;
    startDate?: string | null;
    estimateMinutes?: number | null;
    contextEntityType?: string | null;
    contextEntityId?: string | null;
    sortOrder?: number;
    updatedAt: ReturnType<typeof sql>;
  } = { updatedAt: sql`now()` };

  if (params.title !== undefined) updateSet.title = params.title;
  if (params.description !== undefined) updateSet.description = params.description;
  if (params.priority !== undefined) updateSet.priority = params.priority;
  if (params.taskType !== undefined) updateSet.taskType = params.taskType;
  if (params.dueDate !== undefined) updateSet.dueDate = params.dueDate;
  if (params.startDate !== undefined) updateSet.startDate = params.startDate;
  if (params.estimateMinutes !== undefined) updateSet.estimateMinutes = params.estimateMinutes;
  if (params.contextEntityType !== undefined)
    updateSet.contextEntityType = params.contextEntityType;
  if (params.contextEntityId !== undefined) updateSet.contextEntityId = params.contextEntityId;
  if (params.sortOrder !== undefined) updateSet.sortOrder = params.sortOrder;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.updated",
      entityType: "task",
      entityId: params.taskId as unknown as EntityId,
      correlationId,
      details: { taskId: params.taskId },
    },
    async (tx) => {
      await tx
        .update(commTask)
        .set(updateSet)
        .where(and(eq(commTask.orgId, orgId), eq(commTask.id, params.taskId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_UPDATED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.taskId } };
}

export async function assignTask(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: AssignTaskCommand,
): Promise<CommTaskServiceResult<{ id: CommTaskId }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await loadTaskStatus(db, orgId, params.taskId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_TASK_NOT_FOUND",
        message: "Task not found",
        meta: { taskId: params.taskId },
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.assigned",
      entityType: "task",
      entityId: params.taskId as unknown as EntityId,
      correlationId,
      details: { taskId: params.taskId, assigneeId: params.assigneeId },
    },
    async (tx) => {
      await tx
        .update(commTask)
        .set({ assigneeId: params.assigneeId, updatedAt: sql`now()` })
        .where(and(eq(commTask.orgId, orgId), eq(commTask.id, params.taskId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_ASSIGNED",
        version: "1",
        correlationId,
        payload: { taskId: params.taskId, assigneeId: params.assigneeId },
      });
    },
  );

  return { ok: true, data: { id: params.taskId } };
}

export async function bulkAssignTasks(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: BulkAssignTasksCommand,
): Promise<CommTaskServiceResult<{ processedCount: number }>> {
  const orgId = ctx.activeContext.orgId;
  const uniqueTaskIds = [...new Set(params.taskIds)];
  const existing = await loadTaskStatuses(db, orgId, uniqueTaskIds);

  if (existing.length !== uniqueTaskIds.length) {
    const found = new Set(existing.map((task) => task.id));
    const missingTaskId = uniqueTaskIds.find((taskId) => !found.has(taskId));
    return {
      ok: false,
      error: {
        code: "COMM_TASK_NOT_FOUND",
        message: "One or more tasks were not found",
        meta: missingTaskId ? { taskId: missingTaskId } : undefined,
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.assigned",
      entityType: "task",
      correlationId,
      details: {
        assigneeId: params.assigneeId,
        processedCount: String(uniqueTaskIds.length),
      },
    },
    async (tx) => {
      await tx
        .update(commTask)
        .set({ assigneeId: params.assigneeId, updatedAt: sql`now()` })
        .where(and(eq(commTask.orgId, orgId), inArray(commTask.id, uniqueTaskIds)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASKS_BULK_ASSIGNED",
        version: "1",
        correlationId,
        payload: {
          taskIds: uniqueTaskIds,
          assigneeId: params.assigneeId,
        },
      });
    },
  );

  return { ok: true, data: { processedCount: uniqueTaskIds.length } };
}

export async function transitionTaskStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: TransitionTaskStatusCommand,
): Promise<CommTaskServiceResult<{ id: CommTaskId; status: TaskStatus }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await loadTaskStatus(db, orgId, params.taskId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "COMM_TASK_NOT_FOUND",
        message: "Task not found",
        meta: { taskId: params.taskId },
      },
    };
  }

  const allowed = TASK_STATUS_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(params.toStatus)) {
    return {
      ok: false,
      error: {
        code: "COMM_TASK_INVALID_STATUS_TRANSITION",
        message: `Cannot transition task from ${existing.status} to ${params.toStatus}`,
      },
    };
  }

  const completeMetadata =
    params.toStatus === "done"
      ? {
          completedAt: sql`now()`,
          completedByPrincipalId: policyCtx.principalId,
        }
      : {
          completedAt: null,
          completedByPrincipalId: null,
        };

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.status_changed",
      entityType: "task",
      entityId: params.taskId as unknown as EntityId,
      correlationId,
      details: {
        taskId: params.taskId,
        fromStatus: existing.status,
        toStatus: params.toStatus,
      },
    },
    async (tx) => {
      await tx
        .update(commTask)
        .set({
          status: params.toStatus,
          ...completeMetadata,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commTask.orgId, orgId), eq(commTask.id, params.taskId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_STATUS_CHANGED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          fromStatus: existing.status,
          toStatus: params.toStatus,
          reason: params.reason ?? null,
        },
      });
    },
  );

  return { ok: true, data: { id: params.taskId, status: params.toStatus } };
}

export async function bulkTransitionTaskStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: BulkTransitionTaskStatusCommand,
): Promise<CommTaskServiceResult<{ processedCount: number; status: TaskStatus }>> {
  const orgId = ctx.activeContext.orgId;
  const uniqueTaskIds = [...new Set(params.taskIds)];
  const existing = await loadTaskStatuses(db, orgId, uniqueTaskIds);

  if (existing.length !== uniqueTaskIds.length) {
    const found = new Set(existing.map((task) => task.id));
    const missingTaskId = uniqueTaskIds.find((taskId) => !found.has(taskId));
    return {
      ok: false,
      error: {
        code: "COMM_TASK_NOT_FOUND",
        message: "One or more tasks were not found",
        meta: missingTaskId ? { taskId: missingTaskId } : undefined,
      },
    };
  }

  for (const task of existing) {
    const allowed = TASK_STATUS_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(params.toStatus)) {
      return {
        ok: false,
        error: {
          code: "COMM_TASK_INVALID_STATUS_TRANSITION",
          message: `Cannot transition task from ${task.status} to ${params.toStatus}`,
          meta: { taskId: task.id },
        },
      };
    }
  }

  const completeMetadata =
    params.toStatus === "done"
      ? {
          completedAt: sql`now()`,
          completedByPrincipalId: policyCtx.principalId,
        }
      : {
          completedAt: null,
          completedByPrincipalId: null,
        };

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.status_changed",
      entityType: "task",
      correlationId,
      details: {
        toStatus: params.toStatus,
        processedCount: String(uniqueTaskIds.length),
      },
    },
    async (tx) => {
      await tx
        .update(commTask)
        .set({
          status: params.toStatus,
          ...completeMetadata,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commTask.orgId, orgId), inArray(commTask.id, uniqueTaskIds)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASKS_BULK_TRANSITIONED",
        version: "1",
        correlationId,
        payload: {
          taskIds: uniqueTaskIds,
          toStatus: params.toStatus,
          reason: params.reason ?? null,
        },
      });
    },
  );

  return {
    ok: true,
    data: { processedCount: uniqueTaskIds.length, status: params.toStatus },
  };
}

export async function completeTask(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: CompleteTaskCommand,
): Promise<CommTaskServiceResult<{ id: CommTaskId; status: "done" }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await loadTaskStatus(db, orgId, params.taskId);

  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_TASK_NOT_FOUND", message: "Task not found" },
    };
  }

  if (existing.status === "done") {
    return {
      ok: false,
      error: { code: "COMM_TASK_ALREADY_COMPLETED", message: "Task already completed" },
    };
  }

  const transitioned = await transitionTaskStatus(db, ctx, policyCtx, correlationId, {
    idempotencyKey: params.idempotencyKey,
    taskId: params.taskId,
    toStatus: "done",
    reason: params.reason,
  });

  if (!transitioned.ok) return transitioned;

  if (params.actualMinutes !== undefined) {
    await db
      .update(commTask)
      .set({ actualMinutes: params.actualMinutes, updatedAt: sql`now()` })
      .where(and(eq(commTask.orgId, orgId), eq(commTask.id, params.taskId)));
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.completed",
      entityType: "task",
      entityId: params.taskId as unknown as EntityId,
      correlationId,
      details: {
        taskId: params.taskId,
        actualMinutes: String(params.actualMinutes ?? ""),
      },
    },
    async (tx) => {
      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_COMPLETED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          actualMinutes: params.actualMinutes ?? null,
          reason: params.reason ?? null,
        },
      });
    },
  );

  return { ok: true, data: { id: params.taskId, status: "done" } };
}

export async function archiveTask(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: ArchiveTaskCommand,
): Promise<CommTaskServiceResult<{ id: CommTaskId; status: "archived" }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await loadTaskStatus(db, orgId, params.taskId);

  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_TASK_NOT_FOUND", message: "Task not found" },
    };
  }

  if (existing.status === "archived") {
    return {
      ok: false,
      error: { code: "COMM_TASK_ALREADY_ARCHIVED", message: "Task already archived" },
    };
  }

  const transitioned = await transitionTaskStatus(db, ctx, policyCtx, correlationId, {
    idempotencyKey: params.idempotencyKey,
    taskId: params.taskId,
    toStatus: "archived",
    reason: params.reason,
  });

  if (!transitioned.ok) return transitioned;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.archived",
      entityType: "task",
      entityId: params.taskId as unknown as EntityId,
      correlationId,
      details: { taskId: params.taskId },
    },
    async (tx) => {
      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_ARCHIVED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          reason: params.reason ?? null,
        },
      });
    },
  );

  return { ok: true, data: { id: params.taskId, status: "archived" } };
}

export async function addTaskChecklist(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: AddTaskChecklistCommand,
): Promise<CommTaskServiceResult<{ taskId: CommTaskId; addedCount: number }>> {
  const orgId = ctx.activeContext.orgId;
  const existing = await loadTaskStatus(db, orgId, params.taskId);

  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_TASK_NOT_FOUND", message: "Task not found" },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.checklist_added",
      entityType: "task",
      entityId: params.taskId as unknown as EntityId,
      correlationId,
      details: {
        taskId: params.taskId,
        addedCount: String(params.items.length),
      },
    },
    async (tx) => {
      const [maxSort] = await tx
        .select({ maxSort: sql<number>`coalesce(max(${commTaskChecklistItem.sortOrder}), -1)` })
        .from(commTaskChecklistItem)
        .where(
          and(
            eq(commTaskChecklistItem.orgId, orgId),
            eq(commTaskChecklistItem.taskId, params.taskId),
          ),
        );

      const startingSort = (maxSort?.maxSort ?? -1) + 1;
      await tx.insert(commTaskChecklistItem).values(
        params.items.map((item, index) => ({
          orgId,
          taskId: params.taskId,
          text: item,
          isChecked: false,
          sortOrder: startingSort + index,
        })),
      );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_CHECKLIST_ADDED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          addedCount: params.items.length,
        },
      });
    },
  );

  return { ok: true, data: { taskId: params.taskId, addedCount: params.items.length } };
}

export async function toggleTaskChecklistItem(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: ToggleTaskChecklistItemCommand,
): Promise<CommTaskServiceResult<{ checklistItemId: TaskChecklistItemId; checked: boolean }>> {
  const orgId = ctx.activeContext.orgId;

  const [item] = await db
    .select({ id: commTaskChecklistItem.id })
    .from(commTaskChecklistItem)
    .where(
      and(
        eq(commTaskChecklistItem.orgId, orgId),
        eq(commTaskChecklistItem.taskId, params.taskId),
        eq(commTaskChecklistItem.id, params.checklistItemId),
      ),
    );

  if (!item) {
    return {
      ok: false,
      error: {
        code: "COMM_TASK_CHECKLIST_ITEM_NOT_FOUND",
        message: "Checklist item not found",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.checklist_toggled",
      entityType: "task_checklist_item",
      entityId: params.checklistItemId as unknown as EntityId,
      correlationId,
      details: {
        taskId: params.taskId,
        checklistItemId: params.checklistItemId,
        checked: String(params.checked),
      },
    },
    async (tx) => {
      await tx
        .update(commTaskChecklistItem)
        .set({
          isChecked: params.checked,
          checkedAt: params.checked ? sql`now()` : null,
          checkedByPrincipalId: params.checked ? policyCtx.principalId : null,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(commTaskChecklistItem.orgId, orgId),
            eq(commTaskChecklistItem.taskId, params.taskId),
            eq(commTaskChecklistItem.id, params.checklistItemId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_CHECKLIST_TOGGLED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          checklistItemId: params.checklistItemId,
          checked: params.checked,
        },
      });
    },
  );

  return {
    ok: true,
    data: {
      checklistItemId: params.checklistItemId,
      checked: params.checked,
    },
  };
}

export async function removeTaskChecklistItem(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: RemoveTaskChecklistItemCommand,
): Promise<CommTaskServiceResult<{ checklistItemId: TaskChecklistItemId }>> {
  const orgId = ctx.activeContext.orgId;

  const [item] = await db
    .select({ id: commTaskChecklistItem.id })
    .from(commTaskChecklistItem)
    .where(
      and(
        eq(commTaskChecklistItem.orgId, orgId),
        eq(commTaskChecklistItem.taskId, params.taskId),
        eq(commTaskChecklistItem.id, params.checklistItemId),
      ),
    );

  if (!item) {
    return {
      ok: false,
      error: {
        code: "COMM_TASK_CHECKLIST_ITEM_NOT_FOUND",
        message: "Checklist item not found",
      },
    };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: policyCtx.principalId,
      action: "task.checklist_toggled",
      entityType: "task_checklist_item",
      entityId: params.checklistItemId as unknown as EntityId,
      correlationId,
      details: {
        taskId: params.taskId,
        checklistItemId: params.checklistItemId,
      },
    },
    async (tx) => {
      await tx
        .delete(commTaskChecklistItem)
        .where(
          and(
            eq(commTaskChecklistItem.orgId, orgId),
            eq(commTaskChecklistItem.taskId, params.taskId),
            eq(commTaskChecklistItem.id, params.checklistItemId),
          ),
        );

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_CHECKLIST_REMOVED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          checklistItemId: params.checklistItemId,
        },
      });
    },
  );

  return { ok: true, data: { checklistItemId: params.checklistItemId } };
}

export async function logTaskTimeEntry(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: CommTaskPolicyContext,
  correlationId: CorrelationId,
  params: LogTaskTimeEntryCommand,
): Promise<CommTaskServiceResult<{ timeEntryId: TaskTimeEntryId }>> {
  const orgId = ctx.activeContext.orgId;
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: {
        code: "IAM_PRINCIPAL_NOT_FOUND",
        message: "Authenticated principal is required",
      },
    };
  }
  const principalId = policyCtx.principalId;

  const existing = await loadTaskStatus(db, orgId, params.taskId);

  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_TASK_NOT_FOUND", message: "Task not found" },
    };
  }

  const result = await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "task.time_logged",
      entityType: "task_time_entry",
      correlationId,
      details: {
        taskId: params.taskId,
        minutes: String(params.minutes),
        entryDate: params.entryDate,
      },
    },
    async (tx) => {
      const [timeEntry] = await tx
        .insert(commTaskTimeEntry)
        .values({
          orgId,
          taskId: params.taskId,
          principalId: principalId,
          minutes: params.minutes,
          entryDate: params.entryDate,
          description: params.description ?? null,
        })
        .returning({ id: commTaskTimeEntry.id });

      if (!timeEntry) throw new Error("Failed to create task time entry");

      await tx
        .update(commTask)
        .set({ actualMinutes: sql`coalesce(${commTask.actualMinutes}, 0) + ${params.minutes}` })
        .where(and(eq(commTask.orgId, orgId), eq(commTask.id, params.taskId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: "COMM.TASK_TIME_LOGGED",
        version: "1",
        correlationId,
        payload: {
          taskId: params.taskId,
          timeEntryId: timeEntry.id,
          minutes: params.minutes,
          entryDate: params.entryDate,
        },
      });

      return timeEntry;
    },
  );

  return {
    ok: true,
    data: {
      timeEntryId: result.id as TaskTimeEntryId,
    },
  };
}
