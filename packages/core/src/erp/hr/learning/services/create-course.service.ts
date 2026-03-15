import type { DbClient } from "@afenda/db";
import { auditLog, hrmCourses, outboxEvent } from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";

export interface CreateCourseInput {
  courseCode: string;
  courseName: string;
  courseType: string;
  provider?: string | null;
}

export interface CreateCourseOutput {
  courseId: string;
}

export async function createCourse(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: CreateCourseInput,
): Promise<HrmResult<CreateCourseOutput>> {
  if (!input.courseCode || !input.courseName || !input.courseType) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "courseCode, courseName, and courseType are required");
  }

  try {
    const [existing] = await db
      .select({ id: hrmCourses.id })
      .from(hrmCourses)
      .where(
        and(eq(hrmCourses.orgId, orgId), eq(hrmCourses.courseCode, input.courseCode)),
      );

    if (existing) {
      return err(HRM_ERROR_CODES.CONFLICT, "Course with this code already exists", {
        courseCode: input.courseCode,
      });
    }

    const [row] = await db
      .insert(hrmCourses)
      .values({
        orgId,
        courseCode: input.courseCode,
        courseName: input.courseName,
        courseType: input.courseType,
        provider: input.provider ?? null,
      })
      .returning({ id: hrmCourses.id });

    if (!row) {
      throw new Error("Failed to create course");
    }

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: actorPrincipalId ?? null,
      action: HRM_EVENTS.COURSE_CREATED,
      entityType: "hrm_course",
      entityId: row.id,
      correlationId,
      details: { courseId: row.id, courseCode: input.courseCode },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.COURSE_CREATED",
      version: "1",
      correlationId,
      payload: { courseId: row.id, courseCode: input.courseCode },
    });

    return ok({ courseId: row.id });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to create course", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
