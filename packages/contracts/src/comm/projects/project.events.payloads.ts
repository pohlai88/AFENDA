import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { CorrelationIdSchema, OrgIdSchema, PrincipalIdSchema } from "../../shared/ids.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import {
  CommProjectMilestoneIdSchema,
  ProjectMemberRoleSchema,
  ProjectStatusSchema,
  ProjectVisibilitySchema,
} from "./project.entity.js";
import { ProjectNameSchema } from "./project.shared.js";
import {
  COMM_PROJECT_ARCHIVED,
  COMM_PROJECT_CREATED,
  COMM_PROJECT_DELETED,
  COMM_PROJECT_MEMBER_ADDED,
  COMM_PROJECT_MEMBER_REMOVED,
  COMM_PROJECT_MILESTONE_COMPLETED,
  COMM_PROJECT_MILESTONE_CREATED,
  COMM_PROJECT_STATUS_CHANGED,
  COMM_PROJECT_UPDATED,
} from "./project.events.js";

const ProjectEventContextPayloadSchema = z.object({
  projectId: CommProjectIdSchema,
  orgId: OrgIdSchema,
  correlationId: CorrelationIdSchema,
});

const ProjectEventActorPayloadSchema = z.object({
  principalId: PrincipalIdSchema,
});

const ProjectEventMilestoneRefPayloadSchema = z.object({
  milestoneId: CommProjectMilestoneIdSchema,
});

// ─── Created ──────────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_CREATED} */
export const ProjectCreatedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  name: ProjectNameSchema,
  status: ProjectStatusSchema,
  visibility: ProjectVisibilitySchema,
  ownerId: PrincipalIdSchema,
});

export const CommProjectCreatedEventType = COMM_PROJECT_CREATED;
export type ProjectCreatedEvent = z.infer<typeof ProjectCreatedEventSchema>;

// ─── Updated ──────────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_UPDATED} */
export const ProjectUpdatedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  updatedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectUpdatedEventType = COMM_PROJECT_UPDATED;
export type ProjectUpdatedEvent = z.infer<typeof ProjectUpdatedEventSchema>;

// ─── StatusChanged ────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_STATUS_CHANGED} */
export const ProjectStatusChangedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  fromStatus: ProjectStatusSchema,
  toStatus: ProjectStatusSchema,
  changedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectStatusChangedEventType = COMM_PROJECT_STATUS_CHANGED;
export type ProjectStatusChangedEvent = z.infer<typeof ProjectStatusChangedEventSchema>;

// ─── Archived ─────────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_ARCHIVED} */
export const ProjectArchivedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  archivedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectArchivedEventType = COMM_PROJECT_ARCHIVED;
export type ProjectArchivedEvent = z.infer<typeof ProjectArchivedEventSchema>;

// ─── Deleted ──────────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_DELETED} */
export const ProjectDeletedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  deletedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectDeletedEventType = COMM_PROJECT_DELETED;
export type ProjectDeletedEvent = z.infer<typeof ProjectDeletedEventSchema>;

// ─── MemberAdded ─────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_MEMBER_ADDED} */
export const ProjectMemberAddedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  ...ProjectEventActorPayloadSchema.shape,
  role: ProjectMemberRoleSchema,
  addedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectMemberAddedEventType = COMM_PROJECT_MEMBER_ADDED;
export type ProjectMemberAddedEvent = z.infer<typeof ProjectMemberAddedEventSchema>;

// ─── MemberRemoved ────────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_MEMBER_REMOVED} */
export const ProjectMemberRemovedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  ...ProjectEventActorPayloadSchema.shape,
  removedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectMemberRemovedEventType = COMM_PROJECT_MEMBER_REMOVED;
export type ProjectMemberRemovedEvent = z.infer<typeof ProjectMemberRemovedEventSchema>;

// ─── MilestoneCreated ─────────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_MILESTONE_CREATED} */
export const ProjectMilestoneCreatedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  ...ProjectEventMilestoneRefPayloadSchema.shape,
  name: ProjectNameSchema,
  targetDate: DateSchema,
});

export const CommProjectMilestoneCreatedEventType = COMM_PROJECT_MILESTONE_CREATED;
export type ProjectMilestoneCreatedEvent = z.infer<typeof ProjectMilestoneCreatedEventSchema>;

// ─── MilestoneCompleted ───────────────────────────────────────────────────────

/** @alias {@link COMM_PROJECT_MILESTONE_COMPLETED} */
export const ProjectMilestoneCompletedEventSchema = z.object({
  ...ProjectEventContextPayloadSchema.shape,
  ...ProjectEventMilestoneRefPayloadSchema.shape,
  completedAt: UtcDateTimeSchema,
  completedByPrincipalId: PrincipalIdSchema,
});

export const CommProjectMilestoneCompletedEventType = COMM_PROJECT_MILESTONE_COMPLETED;
export type ProjectMilestoneCompletedEvent = z.infer<typeof ProjectMilestoneCompletedEventSchema>;

export const ProjectEventPayloadSchemas = {
  Created: ProjectCreatedEventSchema,
  Updated: ProjectUpdatedEventSchema,
  StatusChanged: ProjectStatusChangedEventSchema,
  Archived: ProjectArchivedEventSchema,
  Deleted: ProjectDeletedEventSchema,
  MemberAdded: ProjectMemberAddedEventSchema,
  MemberRemoved: ProjectMemberRemovedEventSchema,
  MilestoneCreated: ProjectMilestoneCreatedEventSchema,
  MilestoneCompleted: ProjectMilestoneCompletedEventSchema,
} as const;
