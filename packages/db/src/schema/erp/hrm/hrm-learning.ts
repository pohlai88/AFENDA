import { date, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmCourses = pgTable(
  "hrm_courses",
  {
    ...orgColumns,
    courseCode: varchar("course_code", { length: 50 }).notNull(),
    courseName: varchar("course_name", { length: 255 }).notNull(),
    courseType: varchar("course_type", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 255 }),
    ...metadataColumns,
  },
  (t) => ({
    courseCodeUq: uniqueIndex("hrm_courses_org_code_uq").on(t.orgId, t.courseCode),
    courseTypeIdx: index("hrm_courses_type_idx").on(t.orgId, t.courseType),
  }),
);

export const hrmCourseSessions = pgTable(
  "hrm_course_sessions",
  {
    ...orgColumns,
    courseId: uuid("course_id")
      .notNull()
      .references(() => hrmCourses.id),
    sessionDate: date("session_date").notNull(),
    status: varchar("status", { length: 50 }).default("scheduled").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    courseIdx: index("hrm_course_sessions_course_idx").on(t.orgId, t.courseId),
    sessionDateIdx: index("hrm_course_sessions_date_idx").on(t.orgId, t.sessionDate),
    statusIdx: index("hrm_course_sessions_status_idx").on(t.orgId, t.status),
  }),
);

export const hrmLearningEnrollments = pgTable(
  "hrm_learning_enrollments",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => hrmCourses.id),
    sessionId: uuid("session_id").references(() => hrmCourseSessions.id),
    status: varchar("status", { length: 50 }).default("enrolled").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_learning_enrollments_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
    courseIdx: index("hrm_learning_enrollments_course_idx").on(t.orgId, t.courseId),
    statusIdx: index("hrm_learning_enrollments_status_idx").on(t.orgId, t.status),
  }),
);

export const hrmCertifications = pgTable(
  "hrm_certifications",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    certificationCode: varchar("certification_code", { length: 100 }).notNull(),
    issuedAt: date("issued_at").notNull(),
    expiresAt: date("expires_at"),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_certifications_employment_idx").on(t.orgId, t.employmentId),
    codeIdx: index("hrm_certifications_code_idx").on(t.orgId, t.certificationCode),
  }),
);

export const hrmSkills = pgTable(
  "hrm_skills",
  {
    ...orgColumns,
    skillCode: varchar("skill_code", { length: 50 }).notNull(),
    skillName: varchar("skill_name", { length: 255 }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    skillCodeUq: uniqueIndex("hrm_skills_org_code_uq").on(t.orgId, t.skillCode),
    skillCodeIdx: index("hrm_skills_code_idx").on(t.orgId, t.skillCode),
  }),
);

export const hrmSkillProfiles = pgTable(
  "hrm_skill_profiles",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => hrmSkills.id),
    proficiencyLevel: varchar("proficiency_level", { length: 50 }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    employmentSkillUq: uniqueIndex("hrm_skill_profiles_emp_skill_uq").on(
      t.orgId,
      t.employmentId,
      t.skillId,
    ),
    employmentIdx: index("hrm_skill_profiles_employment_idx").on(t.orgId, t.employmentId),
    skillIdx: index("hrm_skill_profiles_skill_idx").on(t.orgId, t.skillId),
  }),
);
