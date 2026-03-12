import type { DbClient } from "@afenda/db";
import { auditLog, hrmInterviewFeedback, hrmInterviews, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  SubmitInterviewFeedbackInput,
  SubmitInterviewFeedbackOutput,
} from "../dto/submit-feedback.dto";

export async function submitInterviewFeedback(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: SubmitInterviewFeedbackInput,
): Promise<HrmResult<SubmitInterviewFeedbackOutput>> {
  const [interview] = await db
    .select({ id: hrmInterviews.id })
    .from(hrmInterviews)
    .where(and(eq(hrmInterviews.orgId, orgId), eq(hrmInterviews.id, input.interviewId)));

  if (!interview) {
    return err(HRM_ERROR_CODES.INTERVIEW_NOT_FOUND, "Interview not found", {
      interviewId: input.interviewId,
    });
  }

  try {
    const data = await db.transaction(async (tx) => {
      const comments = input.feedbackText ?? input.comments;

      const [row] = await tx
        .insert(hrmInterviewFeedback)
        .values({
          orgId,
          interviewId: input.interviewId,
          reviewerEmployeeId: input.reviewerEmployeeId,
          recommendation: input.recommendation,
          comments,
          submittedAt: input.submittedAt ? sql`${input.submittedAt}::date` : sql`now()::date`,
        })
        .returning({ id: hrmInterviewFeedback.id });

      if (!row) {
        throw new Error("Failed to insert feedback");
      }

      const payload = {
        interviewFeedbackId: row.id,
        interviewId: input.interviewId,
      };

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.INTERVIEW_FEEDBACK_SUBMITTED,
        entityType: "hrm_interview_feedback",
        entityId: row.id,
        correlationId,
        details: payload,
      });
      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.INTERVIEW_FEEDBACK_SUBMITTED",
        version: "1",
        correlationId,
        payload,
      });

      return { ...payload, feedbackId: row.id };
    });

    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to submit interview feedback", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}