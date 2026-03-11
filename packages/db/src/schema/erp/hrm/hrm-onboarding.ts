import { boolean, date, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmOnboardingPlans = pgTable(
  "hrm_onboarding_plans",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    templateId: uuid("template_id"),
    planStatus: varchar("plan_status", { length: 50 }).default("open").notNull(),
    startDate: date("start_date"),
    targetCompletionDate: date("target_completion_date"),
    completedAt: date("completed_at"),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_onboarding_plans_employment_idx").on(t.orgId, t.employmentId),
  }),
);

export const hrmOnboardingTasks = pgTable(
  "hrm_onboarding_tasks",
  {
    ...orgColumns,
    onboardingPlanId: uuid("onboarding_plan_id").notNull().references(() => hrmOnboardingPlans.id),
    taskCode: varchar("task_code", { length: 80 }),
    taskTitle: varchar("task_title", { length: 255 }).notNull(),
    ownerEmployeeId: uuid("owner_employee_id"),
    dueDate: date("due_date"),
    completedAt: date("completed_at"),
    taskStatus: varchar("task_status", { length: 50 }).default("pending").notNull(),
    mandatory: boolean("mandatory").default(true).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    planIdx: index("hrm_onboarding_tasks_plan_idx").on(t.orgId, t.onboardingPlanId),
    statusIdx: index("hrm_onboarding_tasks_status_idx").on(t.orgId, t.taskStatus),
  }),
);

export const hrmProbationReviews = pgTable(
  "hrm_probation_reviews",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    reviewDate: date("review_date").notNull(),
    outcome: varchar("outcome", { length: 50 }).notNull(),
    reviewerEmployeeId: uuid("reviewer_employee_id"),
    comments: varchar("comments", { length: 2000 }),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_probation_reviews_employment_idx").on(t.orgId, t.employmentId),
  }),
);

export const hrmSeparationCases = pgTable(
  "hrm_separation_cases",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    caseStatus: varchar("case_status", { length: 50 }).default("open").notNull(),
    separationType: varchar("separation_type", { length: 50 }),
    initiatedAt: date("initiated_at"),
    targetLastWorkingDate: date("target_last_working_date"),
    closedAt: date("closed_at"),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_separation_cases_employment_idx").on(t.orgId, t.employmentId),
    statusIdx: index("hrm_separation_cases_status_idx").on(t.orgId, t.caseStatus),
  }),
);

export const hrmExitClearanceItems = pgTable(
  "hrm_exit_clearance_items",
  {
    ...orgColumns,
    separationCaseId: uuid("separation_case_id").notNull().references(() => hrmSeparationCases.id),
    itemCode: varchar("item_code", { length: 80 }),
    itemLabel: varchar("item_label", { length: 255 }).notNull(),
    ownerEmployeeId: uuid("owner_employee_id"),
    mandatory: boolean("mandatory").default(true).notNull(),
    clearanceStatus: varchar("clearance_status", { length: 50 }).default("pending").notNull(),
    clearedAt: date("cleared_at"),
    ...metadataColumns,
  },
  (t) => ({
    caseIdx: index("hrm_exit_clearance_items_case_idx").on(t.orgId, t.separationCaseId),
    statusIdx: index("hrm_exit_clearance_items_status_idx").on(t.orgId, t.clearanceStatus),
  }),
);