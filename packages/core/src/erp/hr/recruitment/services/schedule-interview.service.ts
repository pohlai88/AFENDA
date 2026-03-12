import type { DbClient } from "@afenda/db";
import { auditLog, hrmCandidateApplications, hrmInterviews, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { ScheduleInterviewInput, ScheduleInterviewOutput } from "../dto/schedule-interview.dto";

export async function scheduleInterview(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: ScheduleInterviewInput,
): Promise<HrmResult<ScheduleInterviewOutput>> {
  const [application] = await db
    .select({ id: hrmCandidateApplications.id })
    .from(hrmCandidateApplications)
    .where(and(eq(hrmCandidateApplications.orgId, orgId), eq(hrmCandidateApplications.id, input.applicationId)));

  if (!application) {
    return err(HRM_ERROR_CODES.APPLICATION_NOT_FOUND, "Application not found", {
      applicationId: input.applicationId,
    });
  }

  if (!input.interviewType) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "interviewType is required");
  }
  if (!input.scheduledAt) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "scheduledAt is required");
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(hrmInterviews)
        .values({
          orgId,
          applicationId: input.applicationId,
          interviewType: input.interviewType,
          scheduledAt: sql`${input.scheduledAt}::date`,
          interviewerEmployeeId: input.interviewerEmployeeId,
          status: input.status ?? "scheduled",
        })
        .returning({ id: hrmInterviews.id, applicationId: hrmInterviews.applicationId, status: hrmInterviews.status });

      if (!row) {
        throw new Error("Failed to insert interview");
      }

      const payload = {
        interviewId: row.id,
        applicationId: row.applicationId,
        status: row.status,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.INTERVIEW_SCHEDULED,
        entityType: "hrm_interview",
        entityId: row.id,
        correlationId,
        details: payload,
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.INTERVIEW_SCHEDULED",
        version: "1",
        correlationId,
        payload,
      });

      return payload;
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to schedule interview", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}