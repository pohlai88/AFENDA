import type { DbClient } from "@afenda/db";
import { commBoardMinutes, commBoardActionItem } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type {
  BoardMeetingId,
  BoardMinuteId,
  OrgId,
} from "@afenda/contracts";

export interface BoardMinuteRow {
  id: string;
  orgId: string;
  meetingId: string;
  resolutionId: string | null;
  createdByPrincipalId: string;
  recordedAt: Date;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardActionItemRow {
  id: string;
  orgId: string;
  minuteId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  createdByPrincipalId: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

export async function listMinutesByMeeting(
  db: DbClient,
  orgId: OrgId,
  meetingId: BoardMeetingId,
): Promise<BoardMinuteRow[]> {
  const rows = await db
    .select()
    .from(commBoardMinutes)
    .where(
      and(
        eq(commBoardMinutes.orgId, orgId),
        eq(commBoardMinutes.meetingId, meetingId),
      ),
    )
    .orderBy(asc(commBoardMinutes.recordedAt), asc(commBoardMinutes.id));

  return rows as unknown as BoardMinuteRow[];
}

export async function listActionItemsByMinute(
  db: DbClient,
  orgId: OrgId,
  minuteId: BoardMinuteId,
): Promise<BoardActionItemRow[]> {
  const rows = await db
    .select()
    .from(commBoardActionItem)
    .where(
      and(
        eq(commBoardActionItem.orgId, orgId),
        eq(commBoardActionItem.minuteId, minuteId),
      ),
    )
    .orderBy(asc(commBoardActionItem.createdAt), asc(commBoardActionItem.id));

  return rows as unknown as BoardActionItemRow[];
}
