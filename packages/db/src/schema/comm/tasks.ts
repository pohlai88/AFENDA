import {
  pgTable,
  pgEnum,
  uuid,
  text,
  date,
  integer,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import { TaskPriorityValues, TaskStatusValues, TaskTypeValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const commTaskStatusEnum = pgEnum("comm_task_status", TaskStatusValues);
export const commTaskPriorityEnum = pgEnum("comm_task_priority", TaskPriorityValues);
export const commTaskTypeEnum = pgEnum("comm_task_type", TaskTypeValues);

export const commTask = pgTable(
  "comm_task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    parentTaskId: uuid("parent_task_id"),
    taskNumber: text("task_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: commTaskStatusEnum("status").notNull().default("draft"),
    priority: commTaskPriorityEnum("priority").notNull().default("none"),
    taskType: commTaskTypeEnum("task_type").notNull().default("task"),
    assigneeId: uuid("assignee_id").references(() => iamPrincipal.id, { onDelete: "set null" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    dueDate: date("due_date"),
    startDate: date("start_date"),
    estimateMinutes: integer("estimate_minutes"),
    actualMinutes: integer("actual_minutes"),
    completedAt: tsz("completed_at"),
    completedByPrincipalId: uuid("completed_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    contextEntityType: text("context_entity_type"),
    contextEntityId: text("context_entity_id"),
    slaBreachAt: tsz("sla_breach_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_task_org_task_number_uidx").on(t.orgId, t.taskNumber),
    index("comm_task_org_status_priority_idx").on(t.orgId, t.status, t.priority),
    index("comm_task_org_assignee_idx").on(t.orgId, t.assigneeId),
    index("comm_task_org_reporter_idx").on(t.orgId, t.reporterId),
    index("comm_task_parent_idx").on(t.parentTaskId),
    index("comm_task_project_idx").on(t.projectId),
    rlsOrg,
  ],
);

export const commTaskChecklistItem = pgTable(
  "comm_task_checklist_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => commTask.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isChecked: boolean("is_checked").notNull().default(false),
    checkedAt: tsz("checked_at"),
    checkedByPrincipalId: uuid("checked_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_task_checklist_task_idx").on(t.taskId),
    index("comm_task_checklist_org_task_idx").on(t.orgId, t.taskId),
    rlsOrg,
  ],
);

export const commTaskTimeEntry = pgTable(
  "comm_task_time_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => commTask.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    minutes: integer("minutes").notNull(),
    entryDate: date("entry_date").notNull(),
    description: text("description"),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_task_time_entry_task_idx").on(t.taskId),
    index("comm_task_time_entry_org_principal_date_idx").on(t.orgId, t.principalId, t.entryDate),
    rlsOrg,
  ],
);

export const commTaskWatcher = pgTable(
  "comm_task_watcher",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => commTask.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_task_watcher_org_task_principal_uidx").on(t.orgId, t.taskId, t.principalId),
    index("comm_task_watcher_org_principal_idx").on(t.orgId, t.principalId),
    index("comm_task_watcher_task_idx").on(t.taskId),
    rlsOrg,
  ],
);
