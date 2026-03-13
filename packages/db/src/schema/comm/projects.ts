import { pgEnum, pgTable, uuid, text, date, integer, index, unique } from "drizzle-orm/pg-core";
import {
  ProjectMemberRoleValues,
  ProjectMilestoneStatusValues,
  ProjectStatusValues,
  ProjectVisibilityValues,
} from "@afenda/contracts";
import { organization, iamPrincipal } from "../kernel/identity";
import { rlsOrg, tsz } from "../_helpers";

export const commProjectStatusEnum = pgEnum("comm_project_status", ProjectStatusValues);
export const commProjectVisibilityEnum = pgEnum("comm_project_visibility", ProjectVisibilityValues);
export const commProjectMemberRoleEnum = pgEnum(
  "comm_project_member_role",
  ProjectMemberRoleValues,
);
export const commProjectMilestoneStatusEnum = pgEnum(
  "comm_project_milestone_status",
  ProjectMilestoneStatusValues,
);

export const commProject = pgTable(
  "comm_project",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectNumber: text("project_number").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: commProjectStatusEnum("status").notNull().default("planning"),
    visibility: commProjectVisibilityEnum("visibility").notNull().default("org"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    completedAt: tsz("completed_at"),
    color: text("color"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_project_org_project_number_uidx").on(t.orgId, t.projectNumber),
    index("comm_project_org_status_idx").on(t.orgId, t.status),
    index("comm_project_org_owner_idx").on(t.orgId, t.ownerId),
    rlsOrg,
  ],
);

export const commProjectMember = pgTable(
  "comm_project_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => commProject.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    role: commProjectMemberRoleEnum("role").notNull().default("viewer"),
    joinedAt: tsz("joined_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_project_member_org_project_principal_uidx").on(
      t.orgId,
      t.projectId,
      t.principalId,
    ),
    index("comm_project_member_project_idx").on(t.projectId),
    index("comm_project_member_org_principal_idx").on(t.orgId, t.principalId),
    rlsOrg,
  ],
);

export const commProjectMilestone = pgTable(
  "comm_project_milestone",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => commProject.id, { onDelete: "cascade" }),
    milestoneNumber: text("milestone_number").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: commProjectMilestoneStatusEnum("status").notNull().default("planned"),
    targetDate: date("target_date").notNull(),
    completedAt: tsz("completed_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_project_milestone_org_project_number_uidx").on(
      t.orgId,
      t.projectId,
      t.milestoneNumber,
    ),
    index("comm_project_milestone_project_idx").on(t.projectId),
    index("comm_project_milestone_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);

export const commProjectPhase = pgTable(
  "comm_project_phase",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => commProject.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sequenceOrder: integer("sequence_order").notNull(),
    startDate: date("start_date"),
    targetEndDate: date("target_end_date"),
    actualEndDate: tsz("actual_end_date"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_project_phase_org_project_order_uidx").on(t.orgId, t.projectId, t.sequenceOrder),
    index("comm_project_phase_project_idx").on(t.projectId),
    rlsOrg,
  ],
);

export const commProjectStatusHistory = pgTable(
  "comm_project_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => commProject.id, { onDelete: "cascade" }),
    fromStatus: commProjectStatusEnum("from_status").notNull(),
    toStatus: commProjectStatusEnum("to_status").notNull(),
    changedByPrincipalId: uuid("changed_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    changedAt: tsz("changed_at").defaultNow().notNull(),
    reason: text("reason"),
  },
  (t) => [index("comm_project_status_history_project_idx").on(t.projectId), rlsOrg],
);
