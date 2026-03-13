import { randomUUID } from "node:crypto";
import type { DbClient } from "@afenda/db";
import { commBoardMeeting, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  BoardMeetingId,
  CorrelationId,
  CreateBoardMeetingCommand,
  OrgId,
  PrincipalId,
  UpdateBoardMeetingCommand,
} from "@afenda/contracts";
import { COMM_MEETING_CREATED, COMM_MEETING_UPDATED } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";

export interface BoardMeetingPolicyContext {
  principalId: PrincipalId | null;
}

export type BoardMeetingServiceError = {
  code: string;
  message: string;
};

export type BoardMeetingServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: BoardMeetingServiceError };

function buildMeetingNumber(): string {
  return `MTG-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function requirePrincipal(
  policyCtx: BoardMeetingPolicyContext,
): BoardMeetingServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }

  return { ok: true, data: policyCtx.principalId };
}

async function loadMeeting(db: DbClient, orgId: OrgId, meetingId: BoardMeetingId) {
  const [row] = await db
    .select()
    .from(commBoardMeeting)
    .where(and(eq(commBoardMeeting.orgId, orgId), eq(commBoardMeeting.id, meetingId)));

  return row ?? null;
}

export async function createMeeting(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: CreateBoardMeetingCommand,
): Promise<BoardMeetingServiceResult<{ id: BoardMeetingId; meetingNumber: string }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;
  const meetingNumber = buildMeetingNumber();

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "meeting.created",
      entityType: "board_meeting" as const,
      correlationId,
      details: { meetingNumber, title: params.title },
    },
    async (tx) => {
      const [meeting] = await tx
        .insert(commBoardMeeting)
        .values({
          orgId,
          meetingNumber,
          title: params.title,
          description: params.description ?? null,
          status: "draft",
          scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null, // gate:allow-js-date — parsing user-provided ISO string
          duration: params.duration ?? 60,
          location: params.location ?? null,
          chairId: params.chairId,
          secretaryId: params.secretaryId ?? null,
          quorumRequired: params.quorumRequired ?? 1,
          createdByPrincipalId: principalId,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_MEETING_CREATED,
        version: "1",
        correlationId,
        payload: {
          meetingId: meeting!.id,
          meetingNumber,
          title: params.title,
          orgId,
          correlationId,
          chairId: meeting!.chairId,
          secretaryId: meeting!.secretaryId ?? null,
        },
      });

      return meeting!;
    },
  );

  return { ok: true, data: { id: result.id as BoardMeetingId, meetingNumber } };
}

export async function updateMeeting(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: UpdateBoardMeetingCommand,
): Promise<BoardMeetingServiceResult<{ id: BoardMeetingId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const existing = await loadMeeting(db, orgId, params.meetingId);
  if (!existing) {
    return { ok: false, error: { code: "COMM_MEETING_NOT_FOUND", message: "Meeting not found" } };
  }

  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return {
      ok: false,
      error: {
        code: "COMM_MEETING_ALREADY_STARTED",
        message: "Meeting cannot be updated after it has started",
      },
    };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "meeting.updated",
      entityType: "board_meeting" as const,
      correlationId,
      details: { meetingNumber: existing.meetingNumber, title: params.title ?? existing.title },
    },
    async (tx) => {
      const [updated] = await tx
        .update(commBoardMeeting)
        .set({
          ...(params.title !== undefined && { title: params.title }),
          ...(params.description !== undefined && { description: params.description }),
          ...(params.scheduledAt !== undefined && {
            scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null, // gate:allow-js-date — parsing user-provided ISO string
          }),
          ...(params.duration !== undefined && { duration: params.duration }),
          ...(params.location !== undefined && { location: params.location }),
          ...(params.chairId !== undefined && { chairId: params.chairId }),
          ...(params.secretaryId !== undefined && { secretaryId: params.secretaryId }),
          ...(params.quorumRequired !== undefined && { quorumRequired: params.quorumRequired }),
          updatedAt: sql`now()`,
        })
        .where(and(eq(commBoardMeeting.orgId, orgId), eq(commBoardMeeting.id, params.meetingId)))
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_MEETING_UPDATED,
        version: "1",
        correlationId,
        payload: {
          meetingId: params.meetingId,
          meetingNumber: existing.meetingNumber,
          orgId,
          correlationId,
        },
      });

      return updated!;
    },
  );

  return { ok: true, data: { id: result.id as BoardMeetingId } };
}
