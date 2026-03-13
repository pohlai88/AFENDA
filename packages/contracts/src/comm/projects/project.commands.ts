import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import {
  ProjectMemberRoleSchema,
  ProjectStatusSchema,
  ProjectVisibilitySchema,
  CommProjectMilestoneIdSchema,
} from "./project.entity.js";
import { CommProjectIdSchema } from "../shared/project-id.js";

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const NameSchema = z.string().trim().min(1).max(200);
const DescriptionSchema = z.string().trim().max(20_000);
const ColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/);

// ─── Base Command Schema ──────────────────────────────────────────────────────

const ProjectCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Date Range Refinement ────────────────────────────────────────────────────

function refineDateRange(
  data: { startDate?: string | null; targetDate?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.startDate && data.targetDate && data.targetDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Target date must be after start date.",
      path: ["targetDate"],
    });
  }
}

// ─── Project Commands ─────────────────────────────────────────────────────────

export const CreateProjectCommandSchema = ProjectCommandBase.extend({
  name: NameSchema,
  description: DescriptionSchema.nullable().optional().default(null),
  visibility: ProjectVisibilitySchema.optional(),
  startDate: DateSchema.nullable().optional().default(null),
  targetDate: DateSchema.nullable().optional().default(null),
  color: ColorSchema.nullable().optional().default(null),
}).superRefine(refineDateRange);

export const UpdateProjectCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
  name: NameSchema.optional(),
  description: DescriptionSchema.nullable().optional(),
  visibility: ProjectVisibilitySchema.optional(),
  startDate: DateSchema.nullable().optional(),
  targetDate: DateSchema.nullable().optional(),
  color: ColorSchema.nullable().optional(),
}).superRefine(refineDateRange);

export const TransitionProjectStatusCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
  toStatus: ProjectStatusSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const ArchiveProjectCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export const DeleteProjectCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
});

// ─── Member Commands ──────────────────────────────────────────────────────────

export const AddProjectMemberCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
  role: ProjectMemberRoleSchema,
});

export const RemoveProjectMemberCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
});

// ─── Milestone Commands ───────────────────────────────────────────────────────

export const CreateProjectMilestoneCommandSchema = ProjectCommandBase.extend({
  projectId: CommProjectIdSchema,
  name: NameSchema,
  description: DescriptionSchema.nullable().optional().default(null),
  targetDate: DateSchema,
});

export const CompleteProjectMilestoneCommandSchema = ProjectCommandBase.extend({
  milestoneId: CommProjectMilestoneIdSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateProjectCommand = z.infer<typeof CreateProjectCommandSchema>;
export type UpdateProjectCommand = z.infer<typeof UpdateProjectCommandSchema>;
export type TransitionProjectStatusCommand = z.infer<typeof TransitionProjectStatusCommandSchema>;
export type ArchiveProjectCommand = z.infer<typeof ArchiveProjectCommandSchema>;
export type DeleteProjectCommand = z.infer<typeof DeleteProjectCommandSchema>;
export type AddProjectMemberCommand = z.infer<typeof AddProjectMemberCommandSchema>;
export type RemoveProjectMemberCommand = z.infer<typeof RemoveProjectMemberCommandSchema>;
export type CreateProjectMilestoneCommand = z.infer<typeof CreateProjectMilestoneCommandSchema>;
export type CompleteProjectMilestoneCommand = z.infer<typeof CompleteProjectMilestoneCommandSchema>;
