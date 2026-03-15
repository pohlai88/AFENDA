import type { DbClient } from "@afenda/db";
import {
  commBoardMeeting,
  commBoardResolution,
  commBoardResolutionVote,
  outboxEvent,
} from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  BoardResolutionId,
  CastVoteCommand,
  CorrelationId,
  OrgId,
  PrincipalId,
  ProposeResolutionCommand,
  ResolutionStatus,
  UpdateResolutionCommand,
  WithdrawResolutionCommand,
} from "@afenda/contracts";
import {
  COMM_RESOLUTION_PROPOSED,
  COMM_RESOLUTION_UPDATED,
  COMM_RESOLUTION_WITHDRAWN,
  COMM_VOTE_CAST,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";
import { getResolutionStateGuardError } from "./resolution.guards";

export interface BoardMeetingPolicyContext {
  principalId?: PrincipalId | null;
}

export type ResolutionServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function requirePrincipal(
  policyCtx: BoardMeetingPolicyContext,
): ResolutionServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

const RESOLUTION_WITHDRAWN_STATUS: ResolutionStatus = "tabled";

export async function proposeResolution(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: ProposeResolutionCommand,
): Promise<ResolutionServiceResult<{ id: BoardResolutionId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [meeting] = await db
    .select()
    .from(commBoardMeeting)
    .where(and(eq(commBoardMeeting.orgId, orgId), eq(commBoardMeeting.id, params.meetingId)));

  if (!meeting) {
    return { ok: false, error: { code: "COMM_MEETING_NOT_FOUND", message: "Meeting not found" } };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.resolution_proposed",
      entityType: "board_resolution" as const,
      correlationId,
      details: { meetingId: params.meetingId, title: params.title },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commBoardResolution)
        .values({
          orgId,
          meetingId: params.meetingId,
          title: params.title,
          description: params.description ?? null,
          status: "proposed",
          proposedById: principalResult.data,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_RESOLUTION_PROPOSED,
        version: "1",
        correlationId,
        payload: {
          resolutionId: row!.id,
          meetingId: params.meetingId,
          title: params.title,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as BoardResolutionId } };
}

export async function updateResolution(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: UpdateResolutionCommand,
): Promise<ResolutionServiceResult<{ id: BoardResolutionId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [resolution] = await db
    .select()
    .from(commBoardResolution)
    .where(
      and(eq(commBoardResolution.orgId, orgId), eq(commBoardResolution.id, params.resolutionId)),
    );

  if (!resolution) {
    return {
      ok: false,
      error: { code: "COMM_RESOLUTION_NOT_FOUND", message: "Resolution not found" },
    };
  }

  const guardError = getResolutionStateGuardError(resolution.status as ResolutionStatus, "update");
  if (guardError) {
    return { ok: false, error: guardError };
  }

  const result = await withAudit<{ id: string; status: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.resolution_proposed",
      entityType: "board_resolution" as const,
      correlationId,
      details: {
        ...(params.title !== undefined ? { title: params.title } : {}),
        ...(params.description !== undefined ? { description: params.description } : {}),
      },
    },
    async (tx) => {
      const [row] = await tx
        .update(commBoardResolution)
        .set({
          ...(params.title !== undefined ? { title: params.title } : {}),
          ...(params.description !== undefined ? { description: params.description } : {}),
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(commBoardResolution.orgId, orgId),
            eq(commBoardResolution.id, params.resolutionId),
          ),
        )
        .returning({
          id: commBoardResolution.id,
          status: commBoardResolution.status,
        });

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_RESOLUTION_UPDATED,
        version: "1",
        correlationId,
        payload: {
          resolutionId: row!.id,
          status: row!.status,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as BoardResolutionId } };
}

export async function withdrawResolution(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: WithdrawResolutionCommand,
): Promise<ResolutionServiceResult<{ id: BoardResolutionId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [resolution] = await db
    .select()
    .from(commBoardResolution)
    .where(
      and(eq(commBoardResolution.orgId, orgId), eq(commBoardResolution.id, params.resolutionId)),
    );

  if (!resolution) {
    return {
      ok: false,
      error: { code: "COMM_RESOLUTION_NOT_FOUND", message: "Resolution not found" },
    };
  }

  const guardError = getResolutionStateGuardError(
    resolution.status as ResolutionStatus,
    "withdraw",
  );
  if (guardError) {
    return { ok: false, error: guardError };
  }

  const result = await withAudit<{ id: string; status: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.resolution_proposed",
      entityType: "board_resolution" as const,
      correlationId,
      details: {
        reason: params.reason ?? null,
      },
    },
    async (tx) => {
      const [row] = await tx
        .update(commBoardResolution)
        .set({
          status: RESOLUTION_WITHDRAWN_STATUS,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(commBoardResolution.orgId, orgId),
            eq(commBoardResolution.id, params.resolutionId),
          ),
        )
        .returning({
          id: commBoardResolution.id,
          status: commBoardResolution.status,
        });

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_RESOLUTION_WITHDRAWN,
        version: "1",
        correlationId,
        payload: {
          resolutionId: row!.id,
          status: row!.status,
          reason: params.reason ?? null,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as BoardResolutionId } };
}

export async function castVote(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: CastVoteCommand,
): Promise<ResolutionServiceResult<{ id: string }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [resolution] = await db
    .select()
    .from(commBoardResolution)
    .where(
      and(eq(commBoardResolution.orgId, orgId), eq(commBoardResolution.id, params.resolutionId)),
    );

  if (!resolution) {
    return {
      ok: false,
      error: { code: "COMM_RESOLUTION_NOT_FOUND", message: "Resolution not found" },
    };
  }

  const guardError = getResolutionStateGuardError(
    resolution.status as ResolutionStatus,
    "cast_vote",
  );
  if (guardError) {
    return { ok: false, error: guardError };
  }

  const [existingVote] = await db
    .select()
    .from(commBoardResolutionVote)
    .where(
      and(
        eq(commBoardResolutionVote.resolutionId, params.resolutionId),
        eq(commBoardResolutionVote.principalId, principalResult.data),
      ),
    );

  if (existingVote) {
    return {
      ok: false,
      error: {
        code: "COMM_RESOLUTION_ALREADY_VOTED",
        message: "You have already voted on this resolution",
      },
    };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.vote_cast",
      entityType: "board_resolution_vote" as const,
      correlationId,
      details: { resolutionId: params.resolutionId, vote: params.vote },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commBoardResolutionVote)
        .values({
          orgId,
          resolutionId: params.resolutionId,
          principalId: principalResult.data,
          vote: params.vote,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_VOTE_CAST,
        version: "1",
        correlationId,
        payload: {
          voteId: row!.id,
          resolutionId: params.resolutionId,
          principalId: principalResult.data,
          vote: params.vote,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id } };
}
