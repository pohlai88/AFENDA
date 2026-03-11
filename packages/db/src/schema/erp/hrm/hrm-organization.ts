import {
  boolean,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  effectiveDateColumns,
  index,
  metadataColumns,
  money,
  orgColumns,
  positionStatusEnum,
} from "./_shared";

export const hrmOrgUnits = pgTable(
  "hrm_org_units",
  {
    ...orgColumns,
    legalEntityId: uuid("legal_entity_id").notNull(),
    orgUnitCode: varchar("org_unit_code", { length: 50 }).notNull(),
    orgUnitName: varchar("org_unit_name", { length: 255 }).notNull(),
    parentOrgUnitId: uuid("parent_org_unit_id"),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    orgUnitCodeUq: uniqueIndex("hrm_org_units_org_code_uq").on(t.orgId, t.orgUnitCode),
    parentIdx: index("hrm_org_units_parent_idx").on(t.orgId, t.parentOrgUnitId),
  }),
);

export const hrmJobs = pgTable(
  "hrm_jobs",
  {
    ...orgColumns,
    jobCode: varchar("job_code", { length: 50 }).notNull(),
    jobTitle: varchar("job_title", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    jobCodeUq: uniqueIndex("hrm_jobs_org_job_code_uq").on(t.orgId, t.jobCode),
  }),
);

export const hrmJobGrades = pgTable(
  "hrm_job_grades",
  {
    ...orgColumns,
    gradeCode: varchar("grade_code", { length: 50 }).notNull(),
    gradeName: varchar("grade_name", { length: 255 }).notNull(),
    gradeRank: integer("grade_rank"),
    minSalaryAmount: money("min_salary_amount"),
    midSalaryAmount: money("mid_salary_amount"),
    maxSalaryAmount: money("max_salary_amount"),
    ...metadataColumns,
  },
  (t) => ({
    gradeCodeUq: uniqueIndex("hrm_job_grades_org_grade_code_uq").on(t.orgId, t.gradeCode),
  }),
);

export const hrmPositions = pgTable(
  "hrm_positions",
  {
    ...orgColumns,
    positionCode: varchar("position_code", { length: 50 }).notNull(),
    positionTitle: varchar("position_title", { length: 255 }).notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    orgUnitId: uuid("org_unit_id"),
    jobId: uuid("job_id"),
    gradeId: uuid("grade_id"),
    positionStatus: positionStatusEnum("position_status").default("open").notNull(),
    isBudgeted: boolean("is_budgeted").default(true).notNull(),
    headcountLimit: integer("headcount_limit").default(1).notNull(),
    ...effectiveDateColumns,
    ...metadataColumns,
  },
  (t) => ({
    positionCodeUq: uniqueIndex("hrm_positions_org_position_code_uq").on(t.orgId, t.positionCode),
    orgIdx: index("hrm_positions_org_idx").on(t.orgId, t.orgUnitId, t.isCurrent),
  }),
);
