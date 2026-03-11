import type { DbClient } from "@afenda/db";
import { auditLog, hrmEmploymentRecords, hrmProbationReviews, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type { RecordProbationReviewInput, RecordProbationReviewOutput } from "../dto/record-probation-review.dto";

export async function recordProbationReview(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordProbationReviewInput,
): Promise<HrmResult<RecordProbationReviewOutput>> {
  const [employment] = await db.select({ id: hrmEmploymentRecords.id }).from(hrmEmploymentRecords).where(and(eq(hrmEmploymentRecords.orgId, orgId), eq(hrmEmploymentRecords.id, input.employmentId)));
  if (!employment) return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", { employmentId: input.employmentId });
  if (!input.reviewDate || !input.outcome) return err(HRM_ERROR_CODES.INVALID_INPUT, "reviewDate and outcome are required");

  try {
    const data = await db.transaction(async (tx) => {
      const [row] = await tx.insert(hrmProbationReviews).values({ orgId, employmentId: input.employmentId, reviewDate: sql`${input.reviewDate}::date`, outcome: input.outcome, reviewerEmployeeId: input.reviewerEmployeeId, comments: input.comments }).returning({ id: hrmProbationReviews.id });
      if (!row) throw new Error("Failed to insert probation review");
      await tx.insert(auditLog).values({ orgId, actorPrincipalId: actorPrincipalId ?? null, action: HRM_EVENTS.PROBATION_REVIEW_RECORDED, entityType: "hrm_probation_review", entityId: row.id, correlationId, details: { probationReviewId: row.id, employmentId: input.employmentId } });
      await tx.insert(outboxEvent).values({ orgId, type: "HRM.PROBATION_REVIEW_RECORDED", version: "1", correlationId, payload: { probationReviewId: row.id, employmentId: input.employmentId } });
      return { probationReviewId: row.id };
    });
    return ok(data);
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record probation review", { cause: error instanceof Error ? error.message : "unknown_error" });
  }
}