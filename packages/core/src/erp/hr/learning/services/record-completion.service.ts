import type { DbClient } from "@afenda/db";
import { auditLog, hrmLearningEnrollments, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface RecordCompletionInput {
  enrollmentId: string;
}

export interface RecordCompletionOutput {
  enrollmentId: string;
  status: string;
}

export async function recordCompletion(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecordCompletionInput,
): Promise<HrmResult<RecordCompletionOutput>> {
  if (!input.enrollmentId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "enrollmentId is required");
  }

  try {
    const [enrollment] = await db
      .select({
        id: hrmLearningEnrollments.id,
        status: hrmLearningEnrollments.status,
      })
      .from(hrmLearningEnrollments)
      .where(
        and(
          eq(hrmLearningEnrollments.orgId, orgId),
          eq(hrmLearningEnrollments.id, input.enrollmentId),
        ),
      );

    if (!enrollment) {
      return err(HRM_ERROR_CODES.ENROLLMENT_NOT_FOUND, "Enrollment not found", {
        enrollmentId: input.enrollmentId,
      });
    }

    if (enrollment.status === "completed") {
      return err(HRM_ERROR_CODES.CONFLICT, "Enrollment already completed", {
        enrollmentId: input.enrollmentId,
      });
    }

    await db
      .update(hrmLearningEnrollments)
      .set({
        status: "completed",
        completedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmLearningEnrollments.orgId, orgId),
          eq(hrmLearningEnrollments.id, input.enrollmentId),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.ENROLLMENT_COMPLETED,
      entityType: "hrm_learning_enrollment",
      entityId: input.enrollmentId,
      correlationId,
      details: { enrollmentId: input.enrollmentId, status: "completed" },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.ENROLLMENT_COMPLETED",
      version: "1",
      correlationId,
      payload: { enrollmentId: input.enrollmentId, status: "completed" },
    });

    return ok({ enrollmentId: input.enrollmentId, status: "completed" });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to record completion", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
