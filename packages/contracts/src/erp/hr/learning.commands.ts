import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";
import { CourseTypeSchema } from "./learning.entity.js";

export const CreateCourseCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  courseCode: z.string().trim().min(1).max(50),
  courseName: z.string().trim().min(1).max(255),
  courseType: CourseTypeSchema,
  provider: z.string().trim().max(255).nullable().optional(),
});

export const CreateCourseSessionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  courseId: UuidSchema,
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const EnrollLearnerCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  courseId: UuidSchema,
  sessionId: UuidSchema.nullable().optional(),
});

export const RecordCompletionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  enrollmentId: UuidSchema,
});

export const RecordCertificationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  certificationCode: z.string().trim().min(1).max(100),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const CreateCourseResultSchema = z.object({
  courseId: UuidSchema,
});

export const CreateCourseSessionResultSchema = z.object({
  sessionId: UuidSchema,
  status: z.string(),
});

export const EnrollLearnerResultSchema = z.object({
  enrollmentId: UuidSchema,
  status: z.string(),
});

export const RecordCompletionResultSchema = z.object({
  enrollmentId: UuidSchema,
  status: z.string(),
});

export const RecordCertificationResultSchema = z.object({
  certificationId: UuidSchema,
});

export type CreateCourseCommand = z.infer<typeof CreateCourseCommandSchema>;
export type CreateCourseSessionCommand = z.infer<typeof CreateCourseSessionCommandSchema>;
export type EnrollLearnerCommand = z.infer<typeof EnrollLearnerCommandSchema>;
export type RecordCompletionCommand = z.infer<typeof RecordCompletionCommandSchema>;
export type RecordCertificationCommand = z.infer<typeof RecordCertificationCommandSchema>;
export type CreateCourseResult = z.infer<typeof CreateCourseResultSchema>;
export type CreateCourseSessionResult = z.infer<typeof CreateCourseSessionResultSchema>;
export type EnrollLearnerResult = z.infer<typeof EnrollLearnerResultSchema>;
export type RecordCompletionResult = z.infer<typeof RecordCompletionResultSchema>;
export type RecordCertificationResult = z.infer<typeof RecordCertificationResultSchema>;
