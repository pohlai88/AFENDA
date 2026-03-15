import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmCourses,
  hrmEmploymentRecords,
  hrmLearningEnrollments,
  outboxEvent,
} from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface EnrollLearnerInput {
  employmentId: string;
  courseId: string;
  sessionId?: string | null;
}

export interface EnrollLearnerOutput {
  enrollmentId: string;
  status: string;
}

export async function enrollLearner(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: EnrollLearnerInput,
): Promise<HrmResult<EnrollLearnerOutput>> {
  if (!input.employmentId || !input.courseId) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "employmentId and courseId are required");
  }

  try {
    const [employment] = await db
      .select({ id: hrmEmploymentRecords.id })
      .from(hrmEmploymentRecords)
      .where(
        and(
          eq(hrmEmploymentRecords.orgId, orgId),
          eq(hrmEmploymentRecords.id, input.employmentId),
        ),
      );

    if (!employment) {
      return err(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND, "Employment not found", {
        employmentId: input.employmentId,
      });
    }

    const [course] = await db
      .select({ id: hrmCourses.id })
      .from(hrmCourses)
      .where(and(eq(hrmCourses.orgId, orgId), eq(hrmCourses.id, input.courseId)));

    if (!course) {
      return err(HRM_ERROR_CODES.COURSE_NOT_FOUND, "Course not found", {
        courseId: input.courseId,
      });
    }

    const existingConditions = [
      eq(hrmLearningEnrollments.orgId, orgId),
      eq(hrmLearningEnrollments.employmentId, input.employmentId),
      eq(hrmLearningEnrollments.courseId, input.courseId),
    ];
    if (input.sessionId) {
      existingConditions.push(eq(hrmLearningEnrollments.sessionId, input.sessionId));
    } else {
      existingConditions.push(isNull(hrmLearningEnrollments.sessionId));
    }

    const [existing] = await db
      .select({ id: hrmLearningEnrollments.id })
      .from(hrmLearningEnrollments)
      .where(and(...existingConditions));

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Already enrolled in this course/session", {
        employmentId: input.employmentId,
        courseId: input.courseId,
      });
    }

    const [row] = await db
      .insert(hrmLearningEnrollments)
      .values({
        orgId,
        employmentId: input.employmentId,
        courseId: input.courseId,
        sessionId: input.sessionId ?? null,
        status: "enrolled",
      })
      .returning({ id: hrmLearningEnrollments.id, status: hrmLearningEnrollments.status });

    if (!row) {
      throw new Error("Failed to enroll learner");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.LEARNER_ENROLLED,
      entityType: "hrm_learning_enrollment",
      entityId: row.id,
      correlationId,
      details: {
        enrollmentId: row.id,
        employmentId: input.employmentId,
        courseId: input.courseId,
        status: row.status,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.LEARNER_ENROLLED",
      version: "1",
      correlationId,
      payload: {
        enrollmentId: row.id,
        employmentId: input.employmentId,
        courseId: input.courseId,
      },
    });

    return ok({ enrollmentId: row.id, status: row.status });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to enroll learner", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
