import type { DbClient } from "@afenda/db";
import { hrmRosterAssignments } from "@afenda/db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface RosterAssignmentListItem {
  rosterAssignmentId: string;
  employmentId: string;
  shiftId: string;
  workDate: string;
  status: string;
}

export interface ListRosterAssignmentsInput {
  orgId: string;
  employmentId?: string;
  shiftId?: string;
  status?: string;
  workDateFrom?: string;
  workDateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ListRosterAssignmentsResult {
  items: RosterAssignmentListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listRosterAssignments(
  db: DbClient,
  input: ListRosterAssignmentsInput,
): Promise<ListRosterAssignmentsResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const filters = [eq(hrmRosterAssignments.orgId, input.orgId)];

  if (input.employmentId) {
    filters.push(eq(hrmRosterAssignments.employmentId, input.employmentId));
  }

  if (input.shiftId) {
    filters.push(eq(hrmRosterAssignments.shiftId, input.shiftId));
  }

  if (input.status) {
    filters.push(eq(hrmRosterAssignments.status, input.status));
  }

  if (input.workDateFrom) {
    filters.push(gte(hrmRosterAssignments.workDate, input.workDateFrom));
  }

  if (input.workDateTo) {
    filters.push(lte(hrmRosterAssignments.workDate, input.workDateTo));
  }

  const rows = await db
    .select({
      rosterAssignmentId: hrmRosterAssignments.id,
      employmentId: hrmRosterAssignments.employmentId,
      shiftId: hrmRosterAssignments.shiftId,
      workDate: hrmRosterAssignments.workDate,
      status: hrmRosterAssignments.status,
    })
    .from(hrmRosterAssignments)
    .where(and(...filters))
    .orderBy(desc(hrmRosterAssignments.workDate), desc(hrmRosterAssignments.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmRosterAssignments)
    .where(and(...filters));

  return {
    items: rows.map((row) => ({
      rosterAssignmentId: row.rosterAssignmentId,
      employmentId: row.employmentId,
      shiftId: row.shiftId,
      workDate: String(row.workDate),
      status: row.status,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
