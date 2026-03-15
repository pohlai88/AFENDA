import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const ListCoursesParamsSchema = z.object({
  courseType: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const ListEnrollmentsParamsSchema = z.object({
  employmentId: UuidSchema.optional(),
  courseId: UuidSchema.optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const ListCertificationsByEmployeeParamsSchema = z.object({
  employmentId: UuidSchema,
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type ListCoursesParams = z.infer<typeof ListCoursesParamsSchema>;
export type ListEnrollmentsParams = z.infer<typeof ListEnrollmentsParamsSchema>;
export type ListCertificationsByEmployeeParams = z.infer<
  typeof ListCertificationsByEmployeeParamsSchema
>;
