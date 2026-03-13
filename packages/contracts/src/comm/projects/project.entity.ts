import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";

export const ProjectStatusValues = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
  "archived",
] as const;

export const ProjectVisibilityValues = ["org", "team", "private"] as const;

export const ProjectMemberRoleValues = ["owner", "editor", "viewer"] as const;

export const ProjectMilestoneStatusValues = [
  "planned",
  "on_track",
  "at_risk",
  "completed",
  "cancelled",
] as const;

export const CommProjectMemberIdSchema = UuidSchema.brand<"CommProjectMemberId">();
export const CommProjectMilestoneIdSchema = UuidSchema.brand<"CommProjectMilestoneId">();
export const CommProjectPhaseIdSchema = UuidSchema.brand<"CommProjectPhaseId">();

export const ProjectStatusSchema = z.enum(ProjectStatusValues);
export const ProjectVisibilitySchema = z.enum(ProjectVisibilityValues);
export const ProjectMemberRoleSchema = z.enum(ProjectMemberRoleValues);
export const ProjectMilestoneStatusSchema = z.enum(ProjectMilestoneStatusValues);

export const ProjectSchema = z.object({
  id: CommProjectIdSchema,
  orgId: OrgIdSchema,
  projectNumber: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20_000).nullable(),
  status: ProjectStatusSchema,
  visibility: ProjectVisibilitySchema,
  ownerId: PrincipalIdSchema,
  startDate: DateSchema.nullable(),
  targetDate: DateSchema.nullable(),
  completedAt: UtcDateTimeSchema.nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const ProjectMemberSchema = z.object({
  id: CommProjectMemberIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
  role: ProjectMemberRoleSchema,
  joinedAt: UtcDateTimeSchema,
});

export const ProjectMilestoneSchema = z.object({
  id: CommProjectMilestoneIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  milestoneNumber: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20_000).nullable(),
  status: ProjectMilestoneStatusSchema,
  targetDate: DateSchema,
  completedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const ProjectPhaseSchema = z.object({
  id: CommProjectPhaseIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(20_000).nullable(),
  sequenceOrder: z.number().int().positive(),
  startDate: DateSchema.nullable(),
  targetEndDate: DateSchema.nullable(),
  actualEndDate: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const ProjectStatusHistorySchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  fromStatus: ProjectStatusSchema,
  toStatus: ProjectStatusSchema,
  changedByPrincipalId: PrincipalIdSchema,
  changedAt: UtcDateTimeSchema,
  reason: z.string().trim().max(500).nullable(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type ProjectVisibility = z.infer<typeof ProjectVisibilitySchema>;
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;
export type ProjectMilestoneStatus = z.infer<typeof ProjectMilestoneStatusSchema>;
export type CommProjectMemberId = z.infer<typeof CommProjectMemberIdSchema>;
export type CommProjectMilestoneId = z.infer<typeof CommProjectMilestoneIdSchema>;
export type CommProjectPhaseId = z.infer<typeof CommProjectPhaseIdSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;
export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;
export type ProjectPhase = z.infer<typeof ProjectPhaseSchema>;
export type ProjectStatusHistory = z.infer<typeof ProjectStatusHistorySchema>;
