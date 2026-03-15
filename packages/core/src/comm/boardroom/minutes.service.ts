import type { DbClient } from "@afenda/db";
import { commBoardMeeting, commBoardMinutes, commBoardActionItem, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  BoardMinuteId,
  BoardActionItemId,
  CorrelationId,
  OrgId,
  PrincipalId,
  RecordMinutesCommand,
  CreateActionItemCommand,
  UpdateActionItemCommand,
} from "@afenda/contracts";
import { CommMinutesEvents } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";

export interface BoardMeetingPolicyContext {
  principalId?: PrincipalId | null;
}

export type MinutesServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function requirePrincipal(policyCtx: BoardMeetingPolicyContext): MinutesServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

export async function recordMinutes(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: RecordMinutesCommand,
): Promise<MinutesServiceResult<{ id: BoardMinuteId }>> {
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
      action: "meeting.minutes_recorded",
      entityType: "board_minute" as const,
      correlationId,
      details: { meetingId: params.meetingId, contentLength: params.content.length },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commBoardMinutes)
        .values({
          orgId,
          meetingId: params.meetingId,
          resolutionId: params.resolutionId ?? null,
          createdByPrincipalId: principalResult.data,
          content: params.content,
          metadata: (params.metadata ?? {}) as Record<string, unknown>,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: CommMinutesEvents.MinutesRecorded,
        version: "1",
        correlationId,
        payload: {
          minuteId: row!.id,
          meetingId: params.meetingId,
          resolutionId: params.resolutionId ?? null,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as BoardMinuteId } };
}

export async function createActionItem(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: CreateActionItemCommand,
): Promise<MinutesServiceResult<{ id: BoardActionItemId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [minute] = await db
    .select()
    .from(commBoardMinutes)
    .where(and(eq(commBoardMinutes.orgId, orgId), eq(commBoardMinutes.id, params.minuteId)));

  if (!minute) {
    return { ok: false, error: { code: "COMM_MINUTE_NOT_FOUND", message: "Minute not found" } };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.action_item_created",
      entityType: "board_action_item" as const,
      correlationId,
      details: { minuteId: params.minuteId, title: params.title },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commBoardActionItem)
        .values({
          orgId,
          minuteId: params.minuteId,
          title: params.title,
          description: params.description ?? null,
          assigneeId: params.assigneeId ?? null,
          dueDate: params.dueDate ?? null,
          status: "open",
          createdByPrincipalId: principalResult.data,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: CommMinutesEvents.ActionItemCreated,
        version: "1",
        correlationId,
        payload: {
          actionItemId: row!.id,
          minuteId: params.minuteId,
          meetingId: minute.meetingId,
          title: params.title,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as BoardActionItemId } };
}

export async function updateActionItem(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: UpdateActionItemCommand,
): Promise<MinutesServiceResult<{ id: BoardActionItemId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [existing] = await db
    .select()
    .from(commBoardActionItem)
    .where(and(eq(commBoardActionItem.orgId, orgId), eq(commBoardActionItem.id, params.id)));

  if (!existing) {
    return {
      ok: false,
      error: { code: "COMM_ACTION_ITEM_NOT_FOUND", message: "Action item not found" },
    };
  }

  const closedStatuses = ["done", "cancelled"] as const;
  const newStatus = params.status ?? existing.status;
  const setClosedAt =
    closedStatuses.includes(newStatus as (typeof closedStatuses)[number]) && !existing.closedAt
      ? sql`now()`
      : undefined;

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.action_item_updated",
      entityType: "board_action_item" as const,
      correlationId,
      details: {
        actionItemId: params.id,
        ...(params.status != null && { status: params.status }),
        ...(params.title != null && { title: "updated" }),
      },
    },
    async (tx) => {
      await tx
        .update(commBoardActionItem)
        .set({
          ...(params.title != null && { title: params.title }),
          ...(params.description !== undefined && { description: params.description }),
          ...(params.assigneeId !== undefined && { assigneeId: params.assigneeId }),
          ...(params.dueDate !== undefined && { dueDate: params.dueDate }),
          ...(params.status != null && { status: params.status }),
          ...(setClosedAt != null && { closedAt: setClosedAt }),
          updatedAt: sql`now()`,
        })
        .where(and(eq(commBoardActionItem.orgId, orgId), eq(commBoardActionItem.id, params.id)));

      await tx.insert(outboxEvent).values({
        orgId,
        type: CommMinutesEvents.ActionItemUpdated,
        version: "1",
        correlationId,
        payload: {
          actionItemId: params.id,
          minuteId: existing.minuteId,
          status: params.status ?? existing.status,
          orgId,
          correlationId,
        },
      });
    },
  );

  return { ok: true, data: { id: params.id as BoardActionItemId } };
}
