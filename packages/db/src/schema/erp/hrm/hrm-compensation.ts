import { boolean, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, money, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmCompensationStructures = pgTable(
  "hrm_compensation_structures",
  {
    ...orgColumns,
    structureCode: varchar("structure_code", { length: 50 }).notNull(),
    structureName: varchar("structure_name", { length: 255 }).notNull(),
    payBasis: varchar("pay_basis", { length: 20 }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
    minAmount: money("min_amount").notNull(),
    maxAmount: money("max_amount"),
    ...metadataColumns,
  },
  (t) => ({
    structureCodeUq: uniqueIndex("hrm_comp_structures_org_code_uq").on(t.orgId, t.structureCode),
  }),
);

export const hrmEmployeeCompensationPackages = pgTable(
  "hrm_employee_compensation_packages",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    compensationStructureId: uuid("compensation_structure_id")
      .notNull()
      .references(() => hrmCompensationStructures.id),
    salaryAmount: money("salary_amount").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    isCurrent: boolean("is_current").default(true).notNull(),
    changeReason: varchar("change_reason", { length: 120 }),
    ...metadataColumns,
  },
  (t) => ({
    employmentCurrentIdx: index("hrm_emp_comp_pkg_employment_current_idx").on(
      t.orgId,
      t.employmentId,
      t.isCurrent,
    ),
  }),
);

export const hrmSalaryChangeHistory = pgTable(
  "hrm_salary_change_history",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    compensationStructureId: uuid("compensation_structure_id")
      .notNull()
      .references(() => hrmCompensationStructures.id),
    previousAmount: money("previous_amount"),
    newAmount: money("new_amount").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    changeReason: varchar("change_reason", { length: 500 }),
    recordedBy: uuid("recorded_by"),
    ...metadataColumns,
  },
  (t) => ({
    salaryHistoryEmploymentIdx: index("hrm_salary_history_employment_idx").on(
      t.orgId,
      t.employmentId,
      t.effectiveFrom,
    ),
  }),
);

export const hrmBenefitPlans = pgTable(
  "hrm_benefit_plans",
  {
    ...orgColumns,
    planCode: varchar("plan_code", { length: 50 }).notNull(),
    planName: varchar("plan_name", { length: 255 }).notNull(),
    planType: varchar("plan_type", { length: 30 }).notNull(),
    providerName: varchar("provider_name", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    planCodeUq: uniqueIndex("hrm_benefit_plans_org_code_uq").on(t.orgId, t.planCode),
    planTypeIdx: index("hrm_benefit_plans_type_idx").on(t.orgId, t.planType),
  }),
);

export const hrmBenefitEnrollments = pgTable(
  "hrm_benefit_enrollments",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    benefitPlanId: uuid("benefit_plan_id")
      .notNull()
      .references(() => hrmBenefitPlans.id),
    enrollmentStatus: varchar("enrollment_status", { length: 20 }).notNull().default("active"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull(),
    terminatedAt: timestamp("terminated_at", { withTimezone: true }),
    ...metadataColumns,
  },
  (t) => ({
    activeEnrollmentUq: uniqueIndex("hrm_benefit_enrollments_active_uq").on(
      t.orgId,
      t.employmentId,
      t.benefitPlanId,
    ),
    enrollmentStatusIdx: index("hrm_benefit_enrollments_status_idx").on(
      t.orgId,
      t.enrollmentStatus,
    ),
  }),
);
