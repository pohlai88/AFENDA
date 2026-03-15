import type { DbClient } from "@afenda/db";
import { commBoardMeeting, commBoardMeetingAttendee, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  AddAttendeeCommand,
  BoardMeetingAttendeeId,
  BoardMeetingId,
  CorrelationId,
  OrgId,
  PrincipalId,
  UpdateAttendeeStatusCommand,
} from "@afenda/contracts";
import { COMM_ATTENDEE_ADDED, COMM_ATTENDEE_STATUS_UPDATED } from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../kernel/governance/audit/audit";

export interface BoardMeetingPolicyContext {
  principalId?: PrincipalId | null;
}

export type AttendeeServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function requirePrincipal(
  policyCtx: BoardMeetingPolicyContext,
): AttendeeServiceResult<PrincipalId> {
  if (!policyCtx.principalId) {
    return {
      ok: false,
      error: { code: "IAM_PRINCIPAL_NOT_FOUND", message: "Authenticated principal is required" },
    };
  }
  return { ok: true, data: policyCtx.principalId };
}

export async function addAttendee(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: AddAttendeeCommand,
): Promise<AttendeeServiceResult<{ id: BoardMeetingAttendeeId }>> {
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

  const [existing] = await db
    .select()
    .from(commBoardMeetingAttendee)
    .where(
      and(
        eq(commBoardMeetingAttendee.meetingId, params.meetingId),
        eq(commBoardMeetingAttendee.principalId, params.principalId),
      ),
    );

  if (existing) {
    return {
      ok: false,
      error: {
        code: "COMM_ATTENDEE_ALREADY_ADDED",
        message: "Attendee already added to this meeting",
      },
    };
  }

  const result = await withAudit<{ id: string }>(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.attendee_added",
      entityType: "board_meeting_attendee" as const,
      correlationId,
      details: {
        meetingId: params.meetingId,
        principalId: params.principalId,
        role: params.role ?? null,
      },
    },
    async (tx) => {
      const [row] = await tx
        .insert(commBoardMeetingAttendee)
        .values({
          orgId,
          meetingId: params.meetingId,
          principalId: params.principalId,
          status: "invited",
          role: params.role ?? null,
        })
        .returning();

      await tx.insert(outboxEvent).values({
        orgId,
        type: COMM_ATTENDEE_ADDED,
        version: "1",
        correlationId,
        payload: {
          attendeeId: row!.id,
          meetingId: params.meetingId,
          principalId: params.principalId,
          orgId,
          correlationId,
        },
      });

      return row!;
    },
  );

  return { ok: true, data: { id: result.id as BoardMeetingAttendeeId } };
}

export async function updateAttendeeStatus(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: BoardMeetingPolicyContext,
  correlationId: CorrelationId,
  params: UpdateAttendeeStatusCommand,
): Promise<AttendeeServiceResult<{ id: BoardMeetingAttendeeId }>> {
  const principalResult = requirePrincipal(policyCtx);
  if (!principalResult.ok) return principalResult;

  const orgId = ctx.activeContext.orgId as OrgId;

  const [attendee] = await db
    .select()
    .from(commBoardMeetingAttendee)
    .where(
      and(
        eq(commBoardMeetingAttendee.orgId, orgId),
        eq(commBoardMeetingAttendee.id, params.attendeeId),
      ),
    );

  if (!attendee) {
    return { ok: false, error: { code: "COMM_ATTENDEE_NOT_FOUND", message: "Attendee not found" } };
  }

  await withAudit(
    db,
    ctx,
    {
      actorPrincipalId: principalResult.data,
      action: "meeting.attendee_status_updated",
      entityType: "board_meeting_attendee" as const,
      correlationId,
      details: {
        attendeeId: params.attendeeId,
        meetingId: attendee.meetingId,
        status: params.status,
      },
    },
    async (tx) => {
      await tx
        .update(commBoardMeetingAttendee)
        .set({ status: params.status, updatedAt: sql`now()` })
        .where(eq(commBoardMeetingAttendee.id, params.attendeeId));
    },
  );

  return { ok: true, data: { id: attendee.id as BoardMeetingAttendeeId } };
}
