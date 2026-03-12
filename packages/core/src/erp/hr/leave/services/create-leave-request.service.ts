import type { DbClient } from "@afenda/db";
import { auditLog, hrmLeaveRequests, outboxEvent } from "@afenda/db";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  CreateLeaveRequestInput,
  CreateLeaveRequestOutput,
} from "../dto/create-leave-request.dto";

export async function createLeaveRequest(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateLeaveRequestInput,
): Promise<HrmResult<CreateLeaveRequestOutput>> {
  if (
    !input.employmentId ||
    !input.leaveTypeId ||
    !input.startDate ||
    !input.endDate ||
    !input.requestedAmount
  ) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, leaveTypeId, startDate, endDate and requestedAmount are required",
    );
  }

  if (input.startDate > input.endDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "startDate must be <= endDate");
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmLeaveRequests)
        .values({
          orgId,
          employmentId: input.employmentId,
          leaveTypeId: input.leaveTypeId,
          startDate: sql`${input.startDate}::date`,
          endDate: sql`${input.endDate}::date`,
          requestedAmount: input.requestedAmount,
          reason: input.reason,
          status: "submitted",
          submittedAt: sql`now()`,
          submittedBy: actorPrincipalId ?? null,
        })
        .returning({
          leaveRequestId: hrmLeaveRequests.id,
          employmentId: hrmLeaveRequests.employmentId,
          leaveTypeId: hrmLeaveRequests.leaveTypeId,
          status: hrmLeaveRequests.status,
        });

      if (!row) {
        throw new Error("Failed to create leave request");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.LEAVE_REQUEST_CREATED,
        entityType: "hrm_leave_request",
        entityId: row.leaveRequestId,
        correlationId,
        details: {
          leaveRequestId: row.leaveRequestId,
          employmentId: row.employmentId,
          leaveTypeId: row.leaveTypeId,
          status: row.status,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.LEAVE_REQUEST_CREATED",
        version: "1",
        correlationId,
        payload: {
          leaveRequestId: row.leaveRequestId,
          employmentId: row.employmentId,
          leaveTypeId: row.leaveTypeId,
          status: row.status,
        },
      });

      return ok<CreateLeaveRequestOutput>({
        leaveRequestId: row.leaveRequestId,
        employmentId: row.employmentId,
        leaveTypeId: row.leaveTypeId,
        status: row.status,
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create leave request", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
