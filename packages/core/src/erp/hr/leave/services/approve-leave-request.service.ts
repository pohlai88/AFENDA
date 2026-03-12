import type { DbClient } from "@afenda/db";
import { auditLog, hrmLeaveRequests, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  ApproveLeaveRequestInput,
  ApproveLeaveRequestOutput,
} from "../dto/approve-leave-request.dto";

export async function approveLeaveRequest(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ApproveLeaveRequestInput,
): Promise<HrmResult<ApproveLeaveRequestOutput>> {
  if (!input.leaveRequestId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "leaveRequestId is required");
  }

  if (!input.approved && !input.rejectionReason) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "rejectionReason is required when approved is false");
  }

  const nextStatus = input.approved ? "approved" : "rejected";

  try {
    const data = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: hrmLeaveRequests.id, status: hrmLeaveRequests.status })
        .from(hrmLeaveRequests)
        .where(
          and(eq(hrmLeaveRequests.orgId, orgId), eq(hrmLeaveRequests.id, input.leaveRequestId)),
        );

      if (!existing) {
        return err<ApproveLeaveRequestOutput>(
          HRM_ERROR_CODES.LEAVE_REQUEST_NOT_FOUND,
          "Leave request not found",
          { leaveRequestId: input.leaveRequestId },
        );
      }

      if (existing.status === "approved" || existing.status === "rejected") {
        return err<ApproveLeaveRequestOutput>(
          HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE,
          "Leave request has already been finalized",
          { leaveRequestId: input.leaveRequestId, status: existing.status },
        );
      }

      await tx
        .update(hrmLeaveRequests)
        .set({
          status: nextStatus,
          approvedAt: input.approved ? sql`now()` : null,
          approvedBy: input.approved ? (actorPrincipalId ?? null) : null,
          rejectedAt: input.approved ? null : sql`now()`,
          rejectedBy: input.approved ? null : (actorPrincipalId ?? null),
          rejectionReason: input.approved ? null : input.rejectionReason,
        })
        .where(
          and(eq(hrmLeaveRequests.orgId, orgId), eq(hrmLeaveRequests.id, input.leaveRequestId)),
        );

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.LEAVE_REQUEST_REVIEWED,
        entityType: "hrm_leave_request",
        entityId: input.leaveRequestId,
        correlationId,
        details: {
          leaveRequestId: input.leaveRequestId,
          status: nextStatus,
          rejected: !input.approved,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.LEAVE_REQUEST_REVIEWED",
        version: "1",
        correlationId,
        payload: {
          leaveRequestId: input.leaveRequestId,
          status: nextStatus,
          rejected: !input.approved,
        },
      });

      return ok<ApproveLeaveRequestOutput>({
        leaveRequestId: input.leaveRequestId,
        status: nextStatus,
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to review leave request", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
