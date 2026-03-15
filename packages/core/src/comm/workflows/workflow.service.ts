import type { DbClient } from "@afenda/db";
import { commWorkflow, commWorkflowRun, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CommWorkflowId,
  CommWorkflowRunId,
  CorrelationId,
  EntityId,
  OrgId,
  PrincipalId,
  CreateWorkflowCommand,
  UpdateWorkflowCommand,
  ChangeWorkflowStatusCommand,
  DeleteWorkflowCommand,
  ExecuteWorkflowCommand,
  WorkflowStatus,
} from "@afenda/contracts";
import {
  COMM_WORKFLOW_CREATED,
  COMM_WORKFLOW_UPDATED,
  COMM_WORKFLOW_STATUS_CHANGED,
  COMM_WORKFLOW_DELETED,
  COMM_WORKFLOW_TRIGGERED,
  COMM_WORKFLOW_RUN_COMPLETED,
  COMM_WORKFLOW_RUN_FAILED,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";

export interface WorkflowPolicyContext {
  principalId?: PrincipalId | null;
}

export type WorkflowServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function requirePrincipal(policyCtx: WorkflowPolicyContext): WorkflowServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

export async function createWorkflow(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: WorkflowPolicyContext,
  correlationId: CorrelationId,
  params: CreateWorkflowCommand,
): Promise<WorkflowServiceResult<{ id: CommWorkflowId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "workflow.created",
      entityType: "workflow" as const,
      correlationId,
      details: { name: params.name, triggerType: params.trigger.type },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commWorkflow)
        .values({
          orgId,
          name: params.name,
          description: params.description ?? null,
          status: "draft",
          trigger: params.trigger,
          actions: params.actions,
          createdByPrincipalId: principalResult.data,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_WORKFLOW_CREATED,
        version: "1",
        correlationId,
        payload: {
          workflowId: row!.id,
          name: params.name,
          trigger: params.trigger,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as CommWorkflowId } };
}

export async function updateWorkflow(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: WorkflowPolicyContext,
  correlationId: CorrelationId,
  params: UpdateWorkflowCommand,
): Promise<WorkflowServiceResult<{ id: CommWorkflowId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select()
    .from(commWorkflow)
    .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)));

  if (!existing) {
    return { ok: false, error: { code: "COMM_WORKFLOW_NOT_FOUND", message: "Workflow not found" } };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "workflow.updated",
      entityType: "workflow" as const,
      entityId: params.workflowId as unknown as EntityId,
      correlationId,
      details: {
        name: params.name ?? null,
        triggerType: params.trigger?.type ?? null,
      },
    },
    async (tx) => {
      const [row] = await tx
        .update(commWorkflow)
        .set({
          name: params.name ?? existing.name,
          description: params.description ?? existing.description,
          trigger: params.trigger ?? existing.trigger,
          actions: params.actions ?? existing.actions,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)))
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_WORKFLOW_UPDATED,
        version: "1",
        correlationId,
        payload: {
          workflowId: params.workflowId,
          name: params.name,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as CommWorkflowId } };
}

export async function changeWorkflowStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: WorkflowPolicyContext,
  correlationId: CorrelationId,
  params: ChangeWorkflowStatusCommand,
): Promise<WorkflowServiceResult<{ id: CommWorkflowId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select()
    .from(commWorkflow)
    .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)));

  if (!existing) {
    return { ok: false, error: { code: "COMM_WORKFLOW_NOT_FOUND", message: "Workflow not found" } };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "workflow.status_changed",
      entityType: "workflow" as const,
      entityId: params.workflowId as unknown as EntityId,
      correlationId,
      details: { oldStatus: existing.status, newStatus: params.status },
    },
    async (tx) => {
      const [row] = await tx
        .update(commWorkflow)
        .set({
          status: params.status as WorkflowStatus,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)))
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_WORKFLOW_STATUS_CHANGED,
        version: "1",
        correlationId,
        payload: {
          workflowId: params.workflowId,
          oldStatus: existing.status,
          newStatus: params.status,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as CommWorkflowId } };
}

export async function deleteWorkflow(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: WorkflowPolicyContext,
  correlationId: CorrelationId,
  params: DeleteWorkflowCommand,
): Promise<WorkflowServiceResult<{ id: CommWorkflowId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select()
    .from(commWorkflow)
    .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)));

  if (!existing) {
    return { ok: false, error: { code: "COMM_WORKFLOW_NOT_FOUND", message: "Workflow not found" } };
  }

  await withAudit<void>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "workflow.deleted",
      entityType: "workflow" as const,
      entityId: params.workflowId as unknown as EntityId,
      correlationId,
      details: { name: existing.name },
    },
    async (tx) => {
      await tx
        .delete(commWorkflow)
        .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_WORKFLOW_DELETED,
        version: "1",
        correlationId,
        payload: {
          workflowId: params.workflowId,
          name: existing.name,
          orgId,
          correlationId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.workflowId } };
}

export async function executeWorkflow(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: WorkflowPolicyContext,
  correlationId: CorrelationId,
  params: ExecuteWorkflowCommand,
): Promise<WorkflowServiceResult<{ runId: CommWorkflowRunId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [workflow] = await db
    .select()
    .from(commWorkflow)
    .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)));

  if (!workflow) {
    return { ok: false, error: { code: "COMM_WORKFLOW_NOT_FOUND", message: "Workflow not found" } };
  }

  if (workflow.status !== "active") {
    return {
      ok: false,
      error: { code: "COMM_WORKFLOW_NOT_ACTIVE", message: "Workflow must be active to execute" },
    };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "workflow.triggered",
      entityType: "workflow_run" as const,
      correlationId,
      details: { workflowId: params.workflowId, manual: true },
    },
    async (tx) => {
      const [run] = await tx
        .insert(commWorkflowRun)
        .values({
          orgId,
          workflowId: params.workflowId,
          status: "pending",
          triggerEventId: params.triggerEventId ?? null,
          triggerPayload: params.triggerPayload as unknown as Record<string, unknown>,
          executedActions: [],
        })
        .returning();

      await tx
        .update(commWorkflow)
        .set({
          lastTriggeredAt: sql`now()`,
          runCount: sql`${commWorkflow.runCount} + 1`,
          updatedAt: sql`now()`,
        })
        .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, params.workflowId)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_WORKFLOW_TRIGGERED,
        version: "1",
        correlationId,
        payload: {
          workflowId: params.workflowId,
          runId: run!.id,
          triggerPayload: params.triggerPayload,
          orgId,
          correlationId,
        },
      });

      return run!;
    },
  );

  return { ok: true, data: { runId: result.id as CommWorkflowRunId } };
}

/**
 * Evaluate trigger conditions to determine if workflow should execute
 */
export function evaluateTriggerConditions(
  trigger: {
    type: string;
    conditions?: Array<{ field: string; operator: string; value: unknown }>;
  },
  payload: Record<string, unknown>,
): boolean {
  if (!trigger.conditions || trigger.conditions.length === 0) {
    return true; // No conditions = always execute
  }

  return trigger.conditions.every((condition) => {
    const fieldValue = payload[condition.field];

    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "not_equals":
        return fieldValue !== condition.value;
      case "contains":
        return typeof fieldValue === "string" && fieldValue.includes(String(condition.value));
      case "greater_than":
        return typeof fieldValue === "number" && fieldValue > Number(condition.value);
      case "less_than":
        return typeof fieldValue === "number" && fieldValue < Number(condition.value);
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default:
        return false;
    }
  });
}

/**
 * Execute workflow actions - to be called by worker
 */
export async function executeWorkflowActions(
  db: DbClient,
  ctx: OrgScopedContext,
  runId: CommWorkflowRunId,
  actions: Array<{ type: string; config: Record<string, unknown> }>,
): Promise<void> {
  const orgId = ctx.activeContext.orgId as OrgId;

  const [run] = await db
    .select()
    .from(commWorkflowRun)
    .where(and(eq(commWorkflowRun.orgId, orgId), eq(commWorkflowRun.id, runId)));

  if (!run) {
    throw new Error("Workflow run not found");
  }

  await db
    .update(commWorkflowRun)
    .set({
      status: "running",
      updatedAt: sql`now()`,
    })
    .where(and(eq(commWorkflowRun.orgId, orgId), eq(commWorkflowRun.id, runId)));

  const executedActions: Array<{
    actionType: string;
    status: string;
    result?: unknown;
    error?: string;
  }> = [];

  try {
    for (const action of actions) {
      try {
        // Action execution will be implemented in worker handlers
        // For now, just record that we attempted to execute
        executedActions.push({
          actionType: action.type,
          status: "pending",
        });
      } catch (error) {
        executedActions.push({
          actionType: action.type,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await db
      .update(commWorkflowRun)
      .set({
        status: "completed",
        completedAt: sql`now()`,
        executedActions: executedActions,
        updatedAt: sql`now()`,
      })
      .where(and(eq(commWorkflowRun.orgId, orgId), eq(commWorkflowRun.id, runId)));

    await db.insert(outboxEvent).values({
      orgId,
      type: COMM_WORKFLOW_RUN_COMPLETED,
      version: "1",
      correlationId: runId,
      payload: {
        runId,
        workflowId: run.workflowId,
        executedActions,
        orgId,
        correlationId: runId,
      },
    });
  } catch (error) {
    await db
      .update(commWorkflowRun)
      .set({
        status: "failed",
        completedAt: sql`now()`,
        error: error instanceof Error ? error.message : "Unknown error",
        executedActions: executedActions,
        updatedAt: sql`now()`,
      })
      .where(and(eq(commWorkflowRun.orgId, orgId), eq(commWorkflowRun.id, runId)));

    await db.insert(outboxEvent).values({
      orgId,
      type: COMM_WORKFLOW_RUN_FAILED,
      version: "1",
      correlationId: runId,
      payload: {
        runId,
        workflowId: run.workflowId,
        error: error instanceof Error ? error.message : "Unknown error",
        executedActions,
        orgId,
        correlationId: runId,
      },
    });

    throw error;
  }
}
