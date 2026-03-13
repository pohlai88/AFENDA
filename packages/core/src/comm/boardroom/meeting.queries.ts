import type { DbClient } from "@afenda/db";
import { commBoardMeeting } from "@afenda/db";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import type {
  BoardMeetingId,
  CursorPage,
  MeetingStatus,
  OrgId,
} from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

export interface BoardMeetingRow {
  id: string;
  orgId: string;
  meetingNumber: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: Date | null;
  duration: number;
  location: string | null;
  chairId: string;
  secretaryId: string | null;
  quorumRequired: number;
  startedAt: Date | null;
  adjournedAt: Date | null;
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardMeetingListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listBoardMeetings(
  db: DbClient,
  orgId: OrgId,
  params: BoardMeetingListParams = {},
): Promise<CursorPage<BoardMeetingRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(commBoardMeeting.orgId, orgId)];
  if (params.status) {
    conditions.push(eq(commBoardMeeting.status, params.status as MeetingStatus));
  }
  if (params.cursor) {
    conditions.push(gt(commBoardMeeting.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(commBoardMeeting)
    .where(and(...conditions))
    .orderBy(desc(commBoardMeeting.scheduledAt), asc(commBoardMeeting.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data as BoardMeetingRow[],
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getMeetingById(
  db: DbClient,
  orgId: OrgId,
  id: BoardMeetingId,
): Promise<BoardMeetingRow | null> {
  const [row] = await db
    .select()
    .from(commBoardMeeting)
    .where(and(eq(commBoardMeeting.orgId, orgId), eq(commBoardMeeting.id, id)));
  return (row as BoardMeetingRow) ?? null;
}
