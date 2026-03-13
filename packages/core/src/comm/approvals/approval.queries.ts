import type { DbClient } from "@afenda/db";
import {
  commApprovalRequest,
  commApprovalStep,
  commApprovalPolicy,
  commApprovalDelegation,
  commApprovalStatusHistory,
} from "@afenda/db";
import { and, asc, desc, eq, gt, inArray, or } from "drizzle-orm";
import type {
  ApprovalRequestId,
  ApprovalStatus,
  ApprovalStepStatus,
  OrgId,
  PrincipalId,
  CursorPage,
} from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApprovalRequestRow {
  id: string;
  orgId: string;
  approvalNumber: string;
  title: string;
  sourceEntityType: string;
  sourceEntityId: string;
  requestedByPrincipalId: string;
  status: ApprovalStatus;
  currentStepIndex: number;
  totalSteps: number;
  urgency: string;
  dueDate: string | null;
  resolvedAt: Date | null;
  resolvedByPrincipalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalStepRow {
  id: string;
  orgId: string;
  approvalRequestId: string;
  stepIndex: number;
  label: string | null;
  assigneeId: string;
  delegatedToId: string | null;
  status: ApprovalStepStatus;
  comment: string | null;
  actedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalPolicyRow {
  id: string;
  orgId: string;
  name: string;
  sourceEntityType: string;
  autoApproveBelowAmount: number | null;
  escalationAfterHours: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalDelegationRow {
  id: string;
  orgId: string;
  fromPrincipalId: string;
  toPrincipalId: string;
  validFrom: string;
  validUntil: string;
  reason: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ApprovalStatusHistoryRow {
  id: string;
  orgId: string;
  approvalRequestId: string;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  changedByPrincipalId: string | null;
  reason: string | null;
  occurredAt: Date;
}

export interface ApprovalListParams {
  cursor?: string;
  limit?: number;
  status?: ApprovalStatus;
  requestedByPrincipalId?: PrincipalId;
  sourceEntityType?: string;
}

// ── Cursor helpers ────────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listApprovals(
  db: DbClient,
  orgId: OrgId,
  params: ApprovalListParams = {},
): Promise<CursorPage<ApprovalRequestRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(commApprovalRequest.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(commApprovalRequest.status, params.status));
  }
  if (params.requestedByPrincipalId) {
    conditions.push(eq(commApprovalRequest.requestedByPrincipalId, params.requestedByPrincipalId));
  }
  if (params.sourceEntityType) {
    conditions.push(eq(commApprovalRequest.sourceEntityType, params.sourceEntityType));
  }
  if (params.cursor) {
    conditions.push(gt(commApprovalRequest.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(commApprovalRequest)
    .where(and(...conditions))
    .orderBy(desc(commApprovalRequest.updatedAt), asc(commApprovalRequest.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data as ApprovalRequestRow[],
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getApprovalById(
  db: DbClient,
  orgId: OrgId,
  id: ApprovalRequestId,
): Promise<ApprovalRequestRow | null> {
  const [row] = await db
    .select()
    .from(commApprovalRequest)
    .where(and(eq(commApprovalRequest.orgId, orgId), eq(commApprovalRequest.id, id)))
    .limit(1);
  return (row as ApprovalRequestRow) ?? null;
}

export async function listApprovalSteps(
  db: DbClient,
  orgId: OrgId,
  approvalRequestId: ApprovalRequestId,
): Promise<ApprovalStepRow[]> {
  const rows = await db
    .select()
    .from(commApprovalStep)
    .where(
      and(
        eq(commApprovalStep.orgId, orgId),
        eq(commApprovalStep.approvalRequestId, approvalRequestId),
      ),
    )
    .orderBy(asc(commApprovalStep.stepIndex), asc(commApprovalStep.createdAt));
  return rows as ApprovalStepRow[];
}

export async function listPendingForPrincipal(
  db: DbClient,
  orgId: OrgId,
  principalId: PrincipalId,
  params: { cursor?: string; limit?: number } = {},
): Promise<CursorPage<ApprovalRequestRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  // Find approval requests that have a pending step assigned to this principal
  // (either as direct assignee or delegate)
  const pendingStepRequestIds = db
    .select({ id: commApprovalStep.approvalRequestId })
    .from(commApprovalStep)
    .where(
      and(
        eq(commApprovalStep.orgId, orgId),
        eq(commApprovalStep.status, "pending"),
        or(
          eq(commApprovalStep.assigneeId, principalId),
          eq(commApprovalStep.delegatedToId, principalId),
        ),
      ),
    );

  const conditions = [
    eq(commApprovalRequest.orgId, orgId),
    eq(commApprovalRequest.status, "pending"),
    inArray(commApprovalRequest.id, pendingStepRequestIds),
  ];

  if (params.cursor) {
    conditions.push(gt(commApprovalRequest.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(commApprovalRequest)
    .where(and(...conditions))
    .orderBy(asc(commApprovalRequest.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data as ApprovalRequestRow[],
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function listPolicies(
  db: DbClient,
  orgId: OrgId,
  params: { cursor?: string; limit?: number } = {},
): Promise<CursorPage<ApprovalPolicyRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(commApprovalPolicy.orgId, orgId)];
  if (params.cursor) {
    conditions.push(gt(commApprovalPolicy.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(commApprovalPolicy)
    .where(and(...conditions))
    .orderBy(asc(commApprovalPolicy.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data as ApprovalPolicyRow[],
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function listActiveDelegations(
  db: DbClient,
  orgId: OrgId,
  fromPrincipalId: PrincipalId,
): Promise<ApprovalDelegationRow[]> {
  const rows = await db
    .select()
    .from(commApprovalDelegation)
    .where(
      and(
        eq(commApprovalDelegation.orgId, orgId),
        eq(commApprovalDelegation.fromPrincipalId, fromPrincipalId),
        eq(commApprovalDelegation.isActive, true),
      ),
    )
    .orderBy(desc(commApprovalDelegation.createdAt));
  return rows as ApprovalDelegationRow[];
}

export async function listApprovalStatusHistory(
  db: DbClient,
  orgId: OrgId,
  approvalRequestId: ApprovalRequestId,
): Promise<ApprovalStatusHistoryRow[]> {
  const rows = await db
    .select()
    .from(commApprovalStatusHistory)
    .where(
      and(
        eq(commApprovalStatusHistory.orgId, orgId),
        eq(commApprovalStatusHistory.approvalRequestId, approvalRequestId),
      ),
    )
    .orderBy(asc(commApprovalStatusHistory.occurredAt));
  return rows as ApprovalStatusHistoryRow[];
}
