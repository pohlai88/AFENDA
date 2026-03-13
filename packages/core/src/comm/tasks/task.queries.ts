import type { DbClient } from "@afenda/db";
import { commTask, commTaskChecklistItem, commTaskTimeEntry } from "@afenda/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  CommProjectId,
  CommTaskId,
  PrincipalId,
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@afenda/contracts";

export interface TaskRow {
  id: CommTaskId;
  orgId: string;
  projectId: string | null;
  parentTaskId: string | null;
  taskNumber: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  assigneeId: PrincipalId | null;
  reporterId: PrincipalId;
  dueDate: string | null;
  startDate: string | null;
  estimateMinutes: number | null;
  actualMinutes: number | null;
  completedAt: Date | null;
  completedByPrincipalId: PrincipalId | null;
  sortOrder: number;
  contextEntityType: string | null;
  contextEntityId: string | null;
  slaBreachAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskListParams {
  orgId: string;
  statuses?: TaskStatus[];
  assigneeId?: PrincipalId;
  projectId?: CommProjectId;
  limit?: number;
}

export async function getTaskById(
  db: DbClient,
  orgId: string,
  taskId: CommTaskId,
): Promise<TaskRow | null> {
  const [row] = await db
    .select()
    .from(commTask)
    .where(and(eq(commTask.orgId, orgId), eq(commTask.id, taskId)));

  if (!row) return null;

  return row as TaskRow;
}

export async function listTasks(db: DbClient, params: TaskListParams): Promise<TaskRow[]> {
  const limit = params.limit ?? 100;

  const filters = [eq(commTask.orgId, params.orgId)];

  if (params.assigneeId) {
    filters.push(eq(commTask.assigneeId, params.assigneeId));
  }

  if (params.projectId) {
    filters.push(eq(commTask.projectId, params.projectId));
  }

  if (params.statuses && params.statuses.length > 0) {
    filters.push(inArray(commTask.status, params.statuses));
  }

  const rows = await db
    .select()
    .from(commTask)
    .where(and(...filters))
    .orderBy(desc(commTask.updatedAt), desc(commTask.createdAt))
    .limit(limit);

  return rows as TaskRow[];
}

export async function listTaskChecklistItems(db: DbClient, orgId: string, taskId: CommTaskId) {
  return db
    .select()
    .from(commTaskChecklistItem)
    .where(and(eq(commTaskChecklistItem.orgId, orgId), eq(commTaskChecklistItem.taskId, taskId)))
    .orderBy(commTaskChecklistItem.sortOrder, commTaskChecklistItem.createdAt);
}

export async function listTaskTimeEntries(db: DbClient, orgId: string, taskId: CommTaskId) {
  return db
    .select()
    .from(commTaskTimeEntry)
    .where(and(eq(commTaskTimeEntry.orgId, orgId), eq(commTaskTimeEntry.taskId, taskId)))
    .orderBy(desc(commTaskTimeEntry.entryDate), desc(commTaskTimeEntry.createdAt));
}
