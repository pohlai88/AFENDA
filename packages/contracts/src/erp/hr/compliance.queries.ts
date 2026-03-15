import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const ListPolicyAcknowledgementsParamsSchema = z.object({
  employmentId: UuidSchema.optional(),
  policyDocumentId: UuidSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const ListComplianceChecksByEmployeeParamsSchema = z.object({
  employmentId: UuidSchema,
  checkType: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const ListOverdueComplianceChecksParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type ListPolicyAcknowledgementsParams = z.infer<
  typeof ListPolicyAcknowledgementsParamsSchema
>;
export type ListComplianceChecksByEmployeeParams = z.infer<
  typeof ListComplianceChecksByEmployeeParamsSchema
>;
export type ListOverdueComplianceChecksParams = z.infer<
  typeof ListOverdueComplianceChecksParamsSchema
>;
