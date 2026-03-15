import type { DbClient } from "@afenda/db";
import { hrmCourses } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListCoursesParams {
  orgId: string;
  courseType?: string;
  limit: number;
  offset: number;
}

export interface CourseView {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseType: string;
  provider: string | null;
  createdAt: string;
}

export async function listCourses(
  db: DbClient,
  params: ListCoursesParams,
): Promise<CourseView[]> {
  const conditions = [eq(hrmCourses.orgId, params.orgId)];
  if (params.courseType) {
    conditions.push(eq(hrmCourses.courseType, params.courseType));
  }

  const rows = await db
    .select({
      courseId: hrmCourses.id,
      courseCode: hrmCourses.courseCode,
      courseName: hrmCourses.courseName,
      courseType: hrmCourses.courseType,
      provider: hrmCourses.provider,
      createdAt: hrmCourses.createdAt,
    })
    .from(hrmCourses)
    .where(and(...conditions))
    .orderBy(desc(hrmCourses.createdAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    courseId: r.courseId,
    courseCode: r.courseCode,
    courseName: r.courseName,
    courseType: r.courseType,
    provider: r.provider,
    createdAt: r.createdAt.toISOString(),
  }));
}
