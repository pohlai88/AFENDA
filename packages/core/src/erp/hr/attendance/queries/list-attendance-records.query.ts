import type { DbClient } from "@afenda/db";
import { hrmAttendanceRecords } from "@afenda/db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface AttendanceRecordListItem {
  attendanceRecordId: string;
  employmentId: string;
  workDate: string;
  attendanceStatus: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  source: string | null;
}

export interface ListAttendanceRecordsInput {
  orgId: string;
  employmentId?: string;
  attendanceStatus?: string;
  workDateFrom?: string;
  workDateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ListAttendanceRecordsResult {
  items: AttendanceRecordListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAttendanceRecords(
  db: DbClient,
  input: ListAttendanceRecordsInput,
): Promise<ListAttendanceRecordsResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const filters = [eq(hrmAttendanceRecords.orgId, input.orgId)];

  if (input.employmentId) {
    filters.push(eq(hrmAttendanceRecords.employmentId, input.employmentId));
  }

  if (input.attendanceStatus) {
    filters.push(eq(hrmAttendanceRecords.attendanceStatus, input.attendanceStatus));
  }

  if (input.workDateFrom) {
    filters.push(gte(hrmAttendanceRecords.workDate, input.workDateFrom));
  }

  if (input.workDateTo) {
    filters.push(lte(hrmAttendanceRecords.workDate, input.workDateTo));
  }

  const rows = await db
    .select({
      attendanceRecordId: hrmAttendanceRecords.id,
      employmentId: hrmAttendanceRecords.employmentId,
      workDate: hrmAttendanceRecords.workDate,
      attendanceStatus: hrmAttendanceRecords.attendanceStatus,
      checkInAt: hrmAttendanceRecords.checkInAt,
      checkOutAt: hrmAttendanceRecords.checkOutAt,
      source: hrmAttendanceRecords.source,
    })
    .from(hrmAttendanceRecords)
    .where(and(...filters))
    .orderBy(desc(hrmAttendanceRecords.workDate), desc(hrmAttendanceRecords.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmAttendanceRecords)
    .where(and(...filters));

  return {
    items: rows.map((row) => ({
      attendanceRecordId: row.attendanceRecordId,
      employmentId: row.employmentId,
      workDate: String(row.workDate),
      attendanceStatus: row.attendanceStatus,
      checkInAt: row.checkInAt ? row.checkInAt.toISOString() : null,
      checkOutAt: row.checkOutAt ? row.checkOutAt.toISOString() : null,
      source: row.source ?? null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}
