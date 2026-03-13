import type { DbClient } from "@afenda/db";
import { commBoardAgendaItem } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { BoardMeetingId, OrgId } from "@afenda/contracts";

export interface BoardAgendaItemRow {
  id: string;
  orgId: string;
  meetingId: string;
  sortOrder: number;
  title: string;
  description: string | null;
  presenterId: string | null;
  durationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listAgendaItemsByMeeting(
  db: DbClient,
  orgId: OrgId,
  meetingId: BoardMeetingId,
): Promise<BoardAgendaItemRow[]> {
  const rows = await db
    .select()
    .from(commBoardAgendaItem)
    .where(
      and(
        eq(commBoardAgendaItem.orgId, orgId),
        eq(commBoardAgendaItem.meetingId, meetingId),
      ),
    )
    .orderBy(asc(commBoardAgendaItem.sortOrder), asc(commBoardAgendaItem.id));

  return rows as BoardAgendaItemRow[];
}
