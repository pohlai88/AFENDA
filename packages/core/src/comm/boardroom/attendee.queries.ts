import type { DbClient } from "@afenda/db";
import { commBoardMeetingAttendee } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { BoardMeetingId, OrgId } from "@afenda/contracts";

export interface BoardMeetingAttendeeRow {
  id: string;
  orgId: string;
  meetingId: string;
  principalId: string;
  status: string;
  role: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listAttendeesByMeeting(
  db: DbClient,
  orgId: OrgId,
  meetingId: BoardMeetingId,
): Promise<BoardMeetingAttendeeRow[]> {
  const rows = await db
    .select()
    .from(commBoardMeetingAttendee)
    .where(
      and(
        eq(commBoardMeetingAttendee.orgId, orgId),
        eq(commBoardMeetingAttendee.meetingId, meetingId),
      ),
    )
    .orderBy(asc(commBoardMeetingAttendee.createdAt));

  return rows as BoardMeetingAttendeeRow[];
}
