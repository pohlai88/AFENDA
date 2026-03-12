import type { DbClient } from "@afenda/db";
import { hrmLeaveRequests } from "@afenda/db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface LeaveRequestListItem {
  leaveRequestId: string;
  employmentId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedAmount: string;
  status: string;
  reason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
}

export interface ListLeaveRequestsInput {
  orgId: string;
  employmentId?: string;
  status?: string;
  startDateFrom?: string;
  startDateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ListLeaveRequestsResult {
  items: LeaveRequestListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listLeaveRequests(
  db: DbClient,
  input: ListLeaveRequestsInput,
): Promise<ListLeaveRequestsResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const filters = [eq(hrmLeaveRequests.orgId, input.orgId)];

  if (input.employmentId) {
    filters.push(eq(hrmLeaveRequests.employmentId, input.employmentId));
  }

  if (input.status) {
    filters.push(eq(hrmLeaveRequests.status, input.status as never));
  }

  if (input.startDateFrom) {
    filters.push(gte(hrmLeaveRequests.startDate, input.startDateFrom));
  }

  if (input.startDateTo) {
    filters.push(lte(hrmLeaveRequests.startDate, input.startDateTo));
  }

  const rows = await db
    .select({
      leaveRequestId: hrmLeaveRequests.id,
      employmentId: hrmLeaveRequests.employmentId,
      leaveTypeId: hrmLeaveRequests.leaveTypeId,
      startDate: hrmLeaveRequests.startDate,
      endDate: hrmLeaveRequests.endDate,
      requestedAmount: hrmLeaveRequests.requestedAmount,
      status: hrmLeaveRequests.status,
      reason: hrmLeaveRequests.reason,
      submittedAt: hrmLeaveRequests.submittedAt,
      approvedAt: hrmLeaveRequests.approvedAt,
      rejectedAt: hrmLeaveRequests.rejectedAt,
    })
    .from(hrmLeaveRequests)
    .where(and(...filters))
    .orderBy(desc(hrmLeaveRequests.startDate), desc(hrmLeaveRequests.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmLeaveRequests)
    .where(and(...filters));

  return {
    items: rows.map((row) => ({
      leaveRequestId: row.leaveRequestId,
      employmentId: row.employmentId,
      leaveTypeId: row.leaveTypeId,
      startDate: String(row.startDate),
      endDate: String(row.endDate),
      requestedAmount: String(row.requestedAmount),
      status: row.status,
      reason: row.reason ?? null,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
