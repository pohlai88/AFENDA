import type { DbClient } from "@afenda/db";
import { commWorkflow, commWorkflowRun } from "@afenda/db";
import { and, asc, desc, eq } from "drizzle-orm";
import type {
  CommWorkflowId,
  CommWorkflowRunId,
  OrgId,
  WorkflowStatus,
  WorkflowRunStatus,
} from "@afenda/contracts";

export interface WorkflowRow {
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
}

export interface WorkflowRunRow {
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
}

export async function listWorkflows(
  db: DbClient,
  orgId: OrgId,
  filters?: { status?: WorkflowStatus },
): Promise<WorkflowRow[]> {
  const conditions = [eq(commWorkflow.orgId, orgId)];

  if (filters?.status) {
    conditions.push(eq(commWorkflow.status, filters.status));
  }

  const rows = await db
    .select()
    .from(commWorkflow)
    .where(and(...conditions))
    .orderBy(desc(commWorkflow.createdAt), asc(commWorkflow.id));

  return rows as unknown as WorkflowRow[];
}

export async function getWorkflowById(
  db: DbClient,
  orgId: OrgId,
  workflowId: CommWorkflowId,
): Promise<WorkflowRow | null> {
  const [row] = await db
    .select()
    .from(commWorkflow)
    .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.id, workflowId)));

  return row ? (row as unknown as WorkflowRow) : null;
}

export async function listWorkflowRuns(
  db: DbClient,
  orgId: OrgId,
  workflowId: CommWorkflowId,
  filters?: { status?: WorkflowRunStatus },
): Promise<WorkflowRunRow[]> {
  const conditions = [eq(commWorkflowRun.orgId, orgId), eq(commWorkflowRun.workflowId, workflowId)];

  if (filters?.status) {
    conditions.push(eq(commWorkflowRun.status, filters.status));
  }

  const rows = await db
    .select()
    .from(commWorkflowRun)
    .where(and(...conditions))
    .orderBy(desc(commWorkflowRun.startedAt), asc(commWorkflowRun.id));

  return rows as unknown as WorkflowRunRow[];
}

export async function getWorkflowRunById(
  db: DbClient,
  orgId: OrgId,
  runId: CommWorkflowRunId,
): Promise<WorkflowRunRow | null> {
  const [row] = await db
    .select()
    .from(commWorkflowRun)
    .where(and(eq(commWorkflowRun.orgId, orgId), eq(commWorkflowRun.id, runId)));

  return row ? (row as unknown as WorkflowRunRow) : null;
}

export async function listActiveWorkflowsByTriggerType(
  db: DbClient,
  orgId: OrgId,
  triggerType: string,
): Promise<WorkflowRow[]> {
  const rows = await db
    .select()
    .from(commWorkflow)
    .where(and(eq(commWorkflow.orgId, orgId), eq(commWorkflow.status, "active")))
    .orderBy(asc(commWorkflow.id));

  // Filter by trigger type in application code since we can't query JSONB type directly in Drizzle
  return (rows as unknown as WorkflowRow[]).filter(
    (workflow) => workflow.trigger.type === triggerType,
  );
}
