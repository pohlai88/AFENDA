import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import {
  CommProjectMilestoneIdSchema,
  ProjectMemberRoleSchema,
  ProjectStatusSchema,
  ProjectVisibilitySchema,
} from "./project.entity.js";
import { CommProjectIdSchema } from "../shared/project-id.js";

export const CreateProjectCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20_000).optional(),
  visibility: ProjectVisibilitySchema.optional(),
  startDate: DateSchema.optional(),
  targetDate: DateSchema.optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const UpdateProjectCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema,
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(20_000).nullable().optional(),
  visibility: ProjectVisibilitySchema.optional(),
  startDate: DateSchema.nullable().optional(),
  targetDate: DateSchema.nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});

export const TransitionProjectStatusCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema,
  toStatus: ProjectStatusSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const ArchiveProjectCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const AddProjectMemberCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
  role: ProjectMemberRoleSchema,
});

export const RemoveProjectMemberCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
});

export const CreateProjectMilestoneCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  projectId: CommProjectIdSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20_000).optional(),
  targetDate: DateSchema,
});

export const CompleteProjectMilestoneCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  milestoneId: CommProjectMilestoneIdSchema,
});

export type CreateProjectCommand = z.infer<typeof CreateProjectCommandSchema>;
export type UpdateProjectCommand = z.infer<typeof UpdateProjectCommandSchema>;
export type TransitionProjectStatusCommand = z.infer<typeof TransitionProjectStatusCommandSchema>;
export type ArchiveProjectCommand = z.infer<typeof ArchiveProjectCommandSchema>;
export type AddProjectMemberCommand = z.infer<typeof AddProjectMemberCommandSchema>;
export type RemoveProjectMemberCommand = z.infer<typeof RemoveProjectMemberCommandSchema>;
export type CreateProjectMilestoneCommand = z.infer<typeof CreateProjectMilestoneCommandSchema>;
export type CompleteProjectMilestoneCommand = z.infer<typeof CompleteProjectMilestoneCommandSchema>;
