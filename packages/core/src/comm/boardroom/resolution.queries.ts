import type { DbClient } from "@afenda/db";
import { commBoardResolution, commBoardResolutionVote } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { BoardMeetingId, BoardResolutionId, OrgId } from "@afenda/contracts";

export interface BoardResolutionRow {
  id: string;
  orgId: string;
  meetingId: string;
  title: string;
  description: string | null;
  status: string;
  proposedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardResolutionVoteRow {
  id: string;
  orgId: string;
  resolutionId: string;
  principalId: string;
  vote: string;
  createdAt: Date;
}

export async function listResolutionsByMeeting(
  db: DbClient,
  orgId: OrgId,
  meetingId: BoardMeetingId,
): Promise<BoardResolutionRow[]> {
  const rows = await db
    .select()
    .from(commBoardResolution)
    .where(
      and(
        eq(commBoardResolution.orgId, orgId),
        eq(commBoardResolution.meetingId, meetingId),
      ),
    )
    .orderBy(asc(commBoardResolution.createdAt));

  return rows as BoardResolutionRow[];
}

export async function listVotesByResolution(
  db: DbClient,
  orgId: OrgId,
  resolutionId: BoardResolutionId,
): Promise<BoardResolutionVoteRow[]> {
  const rows = await db
    .select()
    .from(commBoardResolutionVote)
    .where(
      and(
        eq(commBoardResolutionVote.orgId, orgId),
        eq(commBoardResolutionVote.resolutionId, resolutionId),
      ),
    )
    .orderBy(asc(commBoardResolutionVote.createdAt));

  return rows as BoardResolutionVoteRow[];
}
