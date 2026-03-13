import type { DbClient } from "@afenda/db";
import { commBoardAgendaItem, commBoardMeeting, outboxEvent } from "@afenda/db";
import { and, desc, eq, sql } from "drizzle-orm";
import type {
  AddAgendaItemCommand,
  BoardAgendaItemId,
  BoardMeetingId,
  CorrelationId,
  OrgId,
  PrincipalId,
} from "@afenda/contracts";
import { COMM_AGENDA_ITEM_ADDED } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit.js";

export interface BoardMeetingPolicyContext {
  principalId: PrincipalId | null;
}

export type AgendaItemServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function requirePrincipal(
  policyCtx: BoardMeetingPolicyContext,
): AgendaItemServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

export async function addAgendaItem(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: AddAgendaItemCommand,
): Promise<AgendaItemServiceResult<{ id: BoardAgendaItemId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const principalId = principalResult.data;
  const orgId = ctx.activeContext.orgId as OrgId;

  const [meeting] = await db
    .select()
    .from(commBoardMeeting)
    .where(
      and(eq(commBoardMeeting.orgId, orgId), eq(commBoardMeeting.id, params.meetingId)),
    );

  if (!meeting) {
    return { ok: false, error: { code: "COMM_MEETING_NOT_FOUND", message: "Meeting not found" } };
  }

  if (meeting.status !== "draft" && meeting.status !== "scheduled") {
    return {
      ok: false,
      error: {
        code: "COMM_MEETING_ALREADY_STARTED",
        message: "Cannot add agenda items after meeting has started",
      },
    };
  }

  const [maxOrder] = await db
    .select({ sortOrder: commBoardAgendaItem.sortOrder })
    .from(commBoardAgendaItem)
    .where(eq(commBoardAgendaItem.meetingId, params.meetingId))
    .orderBy(desc(commBoardAgendaItem.sortOrder))
    .limit(1);

  const sortOrder = params.sortOrder ?? (maxOrder?.sortOrder ?? -1) + 1;

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalId,
      action: "meeting.agenda_item_added",
      entityType: "board_agenda_item" as const,
      correlationId,
      details: { meetingId: params.meetingId, title: params.title, sortOrder },
    },
    async (tx) => {
      const [item] = await tx
        .insert(commBoardAgendaItem)
        .values({
          orgId,
          meetingId: params.meetingId,
          sortOrder,
          title: params.title,
          description: params.description ?? null,
          presenterId: params.presenterId ?? null,
          durationMinutes: params.durationMinutes ?? null,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_AGENDA_ITEM_ADDED,
        version: "1",
        correlationId,
        payload: {
          agendaItemId: item!.id,
          meetingId: params.meetingId,
          title: params.title,
          orgId,
          correlationId,
        },
      });

      return item!;
    },
  );

  return { ok: true, data: { id: result.id as BoardAgendaItemId } };
}
