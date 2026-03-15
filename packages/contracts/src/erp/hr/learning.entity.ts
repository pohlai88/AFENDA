import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const CourseTypeValues = ["instructor_led", "self_paced", "blended"] as const;
export const CourseTypeSchema = z.enum(CourseTypeValues);

export const SessionStatusValues = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export const SessionStatusSchema = z.enum(SessionStatusValues);

export const EnrollmentStatusValues = ["enrolled", "in_progress", "completed", "withdrawn"] as const;
export const EnrollmentStatusSchema = z.enum(EnrollmentStatusValues);

export const ProficiencyLevelValues = ["beginner", "intermediate", "advanced", "expert"] as const;
export const ProficiencyLevelSchema = z.enum(ProficiencyLevelValues);

export const HrmCourseSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  courseCode: z.string().trim().min(1).max(50),
  courseName: z.string().trim().min(1).max(255),
  courseType: CourseTypeSchema,
  provider: z.string().trim().max(255).nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmCourseSessionSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  courseId: UuidSchema,
  sessionDate: DateSchema,
  status: z.enum(SessionStatusValues),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmLearningEnrollmentSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  courseId: UuidSchema,
  sessionId: UuidSchema.nullable(),
  status: z.enum(EnrollmentStatusValues),
  completedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmCertificationSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  certificationCode: z.string().trim().min(1).max(100),
  issuedAt: DateSchema,
  expiresAt: DateSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmSkillSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  skillCode: z.string().trim().min(1).max(50),
  skillName: z.string().trim().min(1).max(255),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmSkillProfileSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  skillId: UuidSchema,
  proficiencyLevel: z.enum(ProficiencyLevelValues),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmCourse = z.infer<typeof HrmCourseSchema>;
export type HrmCourseSession = z.infer<typeof HrmCourseSessionSchema>;
export type HrmLearningEnrollment = z.infer<typeof HrmLearningEnrollmentSchema>;
export type HrmCertification = z.infer<typeof HrmCertificationSchema>;
export type HrmSkill = z.infer<typeof HrmSkillSchema>;
export type HrmSkillProfile = z.infer<typeof HrmSkillProfileSchema>;
