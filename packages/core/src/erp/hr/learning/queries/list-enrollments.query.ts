import type { DbClient } from "@afenda/db";
import { hrmCourses, hrmLearningEnrollments } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListEnrollmentsParams {
  orgId: string;
  employmentId?: string;
  courseId?: string;
  status?: string;
  limit: number;
  offset: number;
}

export interface EnrollmentView {
  enrollmentId: string;
  employmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  sessionId: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

export async function listEnrollments(
  db: DbClient,
  params: ListEnrollmentsParams,
): Promise<EnrollmentView[]> {
  const conditions = [eq(hrmLearningEnrollments.orgId, params.orgId)];
  if (params.employmentId) {
    conditions.push(eq(hrmLearningEnrollments.employmentId, params.employmentId));
  }
  if (params.courseId) {
    conditions.push(eq(hrmLearningEnrollments.courseId, params.courseId));
  }
  if (params.status) {
    conditions.push(eq(hrmLearningEnrollments.status, params.status));
  }

  const rows = await db
    .select({
      enrollmentId: hrmLearningEnrollments.id,
      employmentId: hrmLearningEnrollments.employmentId,
      courseId: hrmLearningEnrollments.courseId,
      courseCode: hrmCourses.courseCode,
      courseName: hrmCourses.courseName,
      sessionId: hrmLearningEnrollments.sessionId,
      status: hrmLearningEnrollments.status,
      completedAt: hrmLearningEnrollments.completedAt,
      createdAt: hrmLearningEnrollments.createdAt,
    })
    .from(hrmLearningEnrollments)
    .innerJoin(hrmCourses, eq(hrmLearningEnrollments.courseId, hrmCourses.id))
    .where(and(...conditions))
    .orderBy(desc(hrmLearningEnrollments.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    enrollmentId: r.enrollmentId,
    employmentId: r.employmentId,
    courseId: r.courseId,
    courseCode: r.courseCode,
    courseName: r.courseName,
    sessionId: r.sessionId,
    status: r.status,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}
