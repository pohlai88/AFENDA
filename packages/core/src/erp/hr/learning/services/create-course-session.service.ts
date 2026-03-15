import type { DbClient } from "@afenda/db";
import { auditLog, hrmCourseSessions, hrmCourses, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateCourseSessionInput {
  courseId: string;
  sessionDate: string;
}

export interface CreateCourseSessionOutput {
  sessionId: string;
  status: string;
}

export async function createCourseSession(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateCourseSessionInput,
): Promise<HrmResult<CreateCourseSessionOutput>> {
  if (!input.courseId || !input.sessionDate) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "courseId and sessionDate are required");
  }

  try {
    const [course] = await db
      .select({ id: hrmCourses.id })
      .from(hrmCourses)
      .where(and(eq(hrmCourses.orgId, orgId), eq(hrmCourses.id, input.courseId)));

    if (!course) {
      return err(HRM_ERROR_CODES.COURSE_NOT_FOUND, "Course not found", {
        courseId: input.courseId,
      });
    }

    const [row] = await db
      .insert(hrmCourseSessions)
      .values({
        orgId,
        courseId: input.courseId,
        sessionDate: input.sessionDate,
        status: "scheduled",
      })
      .returning({ id: hrmCourseSessions.id, status: hrmCourseSessions.status });

    if (!row) {
      throw new Error("Failed to create course session");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.COURSE_SESSION_CREATED,
      entityType: "hrm_course_session",
      entityId: row.id,
      correlationId,
      details: { sessionId: row.id, courseId: input.courseId, status: row.status },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.COURSE_SESSION_CREATED",
      version: "1",
      correlationId,
      payload: { sessionId: row.id, courseId: input.courseId, status: row.status },
    });

    return ok({ sessionId: row.id, status: row.status });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create course session", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
