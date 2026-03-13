import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";

// ─── ID Brands ────────────────────────────────────────────────────────────────

export const CommProjectMemberIdSchema = UuidSchema.brand<"CommProjectMemberId">();
export const CommProjectMilestoneIdSchema = UuidSchema.brand<"CommProjectMilestoneId">();
export const CommProjectPhaseIdSchema = UuidSchema.brand<"CommProjectPhaseId">();

// ─── Enum Values & Schemas ────────────────────────────────────────────────────

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

export const ProjectStatusSchema = z.enum(ProjectStatusValues);
export const ProjectVisibilitySchema = z.enum(ProjectVisibilityValues);
export const ProjectMemberRoleSchema = z.enum(ProjectMemberRoleValues);
export const ProjectMilestoneStatusSchema = z.enum(ProjectMilestoneStatusValues);

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const NameSchema = z.string().trim().min(1).max(200);
const DescriptionSchema = z.string().trim().max(20_000);
const ReasonSchema = z.string().trim().max(500);
const ColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/);

// ─── Project Schema ───────────────────────────────────────────────────────────

export const ProjectSchema = z
  .object({
    id: CommProjectIdSchema,
    orgId: OrgIdSchema,
    projectNumber: z.string().trim().min(1).max(64),
    name: NameSchema,
    description: DescriptionSchema.nullable().default(null),
    status: ProjectStatusSchema,
    visibility: ProjectVisibilitySchema,
    ownerId: PrincipalIdSchema,
    startDate: DateSchema.nullable().default(null),
    targetDate: DateSchema.nullable().default(null),
    completedAt: UtcDateTimeSchema.nullable().default(null),
    color: ColorSchema.nullable().default(null),
    createdAt: UtcDateTimeSchema,
    updatedAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.targetDate && data.targetDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target date must be after start date.",
        path: ["targetDate"],
      });
    }
    if (data.status === "completed" && !data.completedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completed projects must include completedAt.",
        path: ["completedAt"],
      });
    }
  });

// ─── Project Member Schema ────────────────────────────────────────────────────

export const ProjectMemberSchema = z.object({
  id: CommProjectMemberIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  principalId: PrincipalIdSchema,
  role: ProjectMemberRoleSchema,
  joinedAt: UtcDateTimeSchema,
});

// ─── Project Milestone Schema ─────────────────────────────────────────────────

export const ProjectMilestoneSchema = z.object({
  id: CommProjectMilestoneIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  milestoneNumber: z.string().trim().min(1).max(64),
  name: NameSchema,
  description: DescriptionSchema.nullable().default(null),
  status: ProjectMilestoneStatusSchema,
  targetDate: DateSchema,
  completedAt: UtcDateTimeSchema.nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

// ─── Project Phase Schema ─────────────────────────────────────────────────────

export const ProjectPhaseSchema = z.object({
  id: CommProjectPhaseIdSchema,
  orgId: OrgIdSchema,
  projectId: CommProjectIdSchema,
  name: z.string().trim().min(1).max(120),
  description: DescriptionSchema.nullable().default(null),
  sequenceOrder: z.number().int().positive(),
  startDate: DateSchema.nullable().default(null),
  targetEndDate: DateSchema.nullable().default(null),
  actualEndDate: UtcDateTimeSchema.nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

// ─── Project Status History Schema ────────────────────────────────────────────

export const ProjectStatusHistorySchema = z
  .object({
    id: UuidSchema,
    orgId: OrgIdSchema,
    projectId: CommProjectIdSchema,
    fromStatus: ProjectStatusSchema,
    toStatus: ProjectStatusSchema,
    changedByPrincipalId: PrincipalIdSchema,
    changedAt: UtcDateTimeSchema,
    reason: ReasonSchema.nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (["cancelled", "archived"].includes(data.toStatus) && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cancelled or archived projects must include a reason.",
        path: ["reason"],
      });
    }
  });

// ─── Types ────────────────────────────────────────────────────────────────────

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
