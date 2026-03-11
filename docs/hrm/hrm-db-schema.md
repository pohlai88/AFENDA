Below is a **real AFENDA-style Drizzle scaffold** for the HRM foundation.

I am going to give you:

1. **schema architecture**
2. **shared helpers + enums**
3. **core HR tables**
4. **org / position tables**
5. **compensation**
6. **payroll foundation**
7. **talent**
8. **learning**
9. **audit / evidence**
10. **recommended next files**

This is not every single HRM table yet, but it is the **correct enterprise spine** you can extend safely.

---

# 1. Recommended file structure

```text
packages/db/src/schema/hrm/
  _shared.ts
  hrm-employees.ts
  hrm-employment.ts
  hrm-organization.ts
  hrm-compensation.ts
  hrm-payroll.ts
  hrm-talent.ts
  hrm-learning.ts
  hrm-audit.ts
  index.ts
```

If you want the cleanest start, begin with those 9 files first.

---

# 2. `_shared.ts`

This file centralizes enums, base columns, and helper patterns.

```ts
// packages/db/src/schema/hrm/_shared.ts
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Common enums
 * Prefer business-extensible code tables later for highly configurable values.
 * For now, use stable enums for system-critical states.
 */

export const workerTypeEnum = pgEnum("hrm_worker_type", [
  "employee",
  "contractor",
  "intern",
  "director",
]);

export const employmentTypeEnum = pgEnum("hrm_employment_type", [
  "permanent",
  "contract",
  "temporary",
  "internship",
  "outsourced",
]);

export const employmentStatusEnum = pgEnum("hrm_employment_status", [
  "draft",
  "active",
  "probation",
  "suspended",
  "terminated",
  "inactive",
]);

export const assignmentStatusEnum = pgEnum("hrm_assignment_status", [
  "active",
  "inactive",
  "historical",
]);

export const payFrequencyEnum = pgEnum("hrm_pay_frequency", [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
]);

export const payrollRunTypeEnum = pgEnum("hrm_payroll_run_type", [
  "regular",
  "offcycle",
  "bonus",
  "final_settlement",
  "retro",
]);

export const payrollRunStatusEnum = pgEnum("hrm_payroll_run_status", [
  "draft",
  "collecting_inputs",
  "calculating",
  "review_pending",
  "approved",
  "finalized",
  "cancelled",
]);

export const payrollElementCategoryEnum = pgEnum("hrm_payroll_element_category", [
  "earning",
  "deduction",
  "tax",
  "employer_contribution",
  "accrual",
  "reimbursement",
]);

export const approvalStatusEnum = pgEnum("hrm_approval_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);

export const learningCompletionStatusEnum = pgEnum("hrm_learning_completion_status", [
  "assigned",
  "in_progress",
  "completed",
  "expired",
  "cancelled",
]);

export const evidenceTypeEnum = pgEnum("hrm_evidence_type", [
  "document",
  "contract",
  "certificate",
  "policy_acknowledgement",
  "payroll_snapshot",
  "review_attachment",
  "other",
]);

export const money = (name: string) => numeric(name, { precision: 20, scale: 6 });

/**
 * Shared base columns pattern.
 * Reuse via object spread.
 */
export const tenantColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
  versionNo: integer("version_no").default(1).notNull(),
};

export const effectiveDateColumns = {
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  isCurrent: boolean("is_current").default(true).notNull(),
  changeReason: varchar("change_reason", { length: 100 }),
};

export const approvalColumns = {
  status: approvalStatusEnum("status").default("draft").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  submittedBy: uuid("submitted_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectedBy: uuid("rejected_by"),
  rejectionReason: varchar("rejection_reason", { length: 500 }),
};

export const metadataColumns = {
  metadata: jsonb("metadata"),
};

export { index };
```

---

# 3. `hrm-employees.ts`

This file holds the canonical human and employee profile layer.

```ts
// packages/db/src/schema/hrm/hrm-employees.ts
import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  tenantColumns,
  workerTypeEnum,
  index,
  metadataColumns,
} from "./_shared";

export const hrmPersons = pgTable(
  "hrm_persons",
  {
    ...tenantColumns,

    personCode: varchar("person_code", { length: 50 }).notNull(),
    legalName: varchar("legal_name", { length: 255 }).notNull(),
    preferredName: varchar("preferred_name", { length: 255 }),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    middleName: varchar("middle_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    birthDate: date("birth_date"),
    genderCode: varchar("gender_code", { length: 50 }),
    maritalStatusCode: varchar("marital_status_code", { length: 50 }),
    nationalityCountryCode: varchar("nationality_country_code", { length: 3 }),
    personalEmail: varchar("personal_email", { length: 320 }),
    mobilePhone: varchar("mobile_phone", { length: 50 }),
    photoFileId: uuid("photo_file_id"),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    personCodeUq: uniqueIndex("hrm_persons_tenant_person_code_uq").on(t.tenantId, t.personCode),
    personalEmailIdx: index("hrm_persons_personal_email_idx").on(t.tenantId, t.personalEmail),
  }),
);

export const hrmPersonIdentities = pgTable(
  "hrm_person_identities",
  {
    ...tenantColumns,

    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    identityType: varchar("identity_type", { length: 50 }).notNull(),
    identityNumber: varchar("identity_number", { length: 120 }).notNull(),
    issuingCountryCode: varchar("issuing_country_code", { length: 3 }),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    verificationStatus: varchar("verification_status", { length: 50 }).default("unverified").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    personIdx: index("hrm_person_identities_person_idx").on(t.tenantId, t.personId),
    identityLookupIdx: index("hrm_person_identities_lookup_idx").on(
      t.tenantId,
      t.identityType,
      t.identityNumber,
    ),
  }),
);

export const hrmEmployeeProfiles = pgTable(
  "hrm_employee_profiles",
  {
    ...tenantColumns,

    personId: uuid("person_id").notNull().references(() => hrmPersons.id),
    employeeCode: varchar("employee_code", { length: 50 }).notNull(),
    workerType: workerTypeEnum("worker_type").notNull(),
    hireSource: varchar("hire_source", { length: 100 }),
    currentStatus: varchar("current_status", { length: 50 }).default("active").notNull(),

    primaryLegalEntityId: uuid("primary_legal_entity_id"),
    primaryEmploymentId: uuid("primary_employment_id"),
    avatarFileId: uuid("avatar_file_id"),
    joinedGroupAt: date("joined_group_at"),
    leftGroupAt: date("left_group_at"),

    ...metadataColumns,
  },
  (t) => ({
    employeeCodeUq: uniqueIndex("hrm_employee_profiles_tenant_employee_code_uq").on(
      t.tenantId,
      t.employeeCode,
    ),
    personIdx: index("hrm_employee_profiles_person_idx").on(t.tenantId, t.personId),
    statusIdx: index("hrm_employee_profiles_status_idx").on(t.tenantId, t.currentStatus),
  }),
);

export const hrmPersonsRelations = relations(hrmPersons, ({ many }) => ({
  identities: many(hrmPersonIdentities),
  employeeProfiles: many(hrmEmployeeProfiles),
}));

export const hrmPersonIdentitiesRelations = relations(hrmPersonIdentities, ({ one }) => ({
  person: one(hrmPersons, {
    fields: [hrmPersonIdentities.personId],
    references: [hrmPersons.id],
  }),
}));

export const hrmEmployeeProfilesRelations = relations(hrmEmployeeProfiles, ({ one }) => ({
  person: one(hrmPersons, {
    fields: [hrmEmployeeProfiles.personId],
    references: [hrmPersons.id],
  }),
}));
```

---

# 4. `hrm-employment.ts`

This is the real employment truth layer.

```ts
// packages/db/src/schema/hrm/hrm-employment.ts
import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  assignmentStatusEnum,
  effectiveDateColumns,
  employmentStatusEnum,
  employmentTypeEnum,
  index,
  metadataColumns,
  tenantColumns,
} from "./_shared";
import { hrmEmployeeProfiles } from "./hrm-employees";

export const hrmEmploymentRecords = pgTable(
  "hrm_employment_records",
  {
    ...tenantColumns,

    employeeId: uuid("employee_id").notNull().references(() => hrmEmployeeProfiles.id),
    legalEntityId: uuid("legal_entity_id").notNull(),
    employmentNumber: varchar("employment_number", { length: 50 }).notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    workerCategory: varchar("worker_category", { length: 50 }),
    hireDate: date("hire_date").notNull(),
    startDate: date("start_date").notNull(),
    probationEndDate: date("probation_end_date"),
    confirmationDate: date("confirmation_date"),
    terminationDate: date("termination_date"),
    terminationReasonCode: varchar("termination_reason_code", { length: 50 }),
    employmentStatus: employmentStatusEnum("employment_status").default("draft").notNull(),
    payrollStatus: varchar("payroll_status", { length: 50 }).default("active").notNull(),
    noticePeriodDays: varchar("notice_period_days", { length: 20 }),
    isPrimary: boolean("is_primary").default(true).notNull(),

    ...metadataColumns,
  },
  (t) => ({
    employmentNumberUq: uniqueIndex("hrm_employment_records_tenant_number_uq").on(
      t.tenantId,
      t.employmentNumber,
    ),
    employeeIdx: index("hrm_employment_records_employee_idx").on(t.tenantId, t.employeeId),
    legalEntityIdx: index("hrm_employment_records_legal_entity_idx").on(t.tenantId, t.legalEntityId),
    statusIdx: index("hrm_employment_records_status_idx").on(t.tenantId, t.employmentStatus),
  }),
);

export const hrmEmploymentContracts = pgTable(
  "hrm_employment_contracts",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    contractNumber: varchar("contract_number", { length: 50 }).notNull(),
    contractType: varchar("contract_type", { length: 50 }).notNull(),
    contractStartDate: date("contract_start_date").notNull(),
    contractEndDate: date("contract_end_date"),
    renewalTermsJson: varchar("renewal_terms_json", { length: 4000 }),
    signedAt: date("signed_at"),
    documentFileId: uuid("document_file_id"),
    status: varchar("status", { length: 50 }).default("draft").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_employment_contracts_employment_idx").on(t.tenantId, t.employmentId),
  }),
);

export const hrmWorkAssignments = pgTable(
  "hrm_work_assignments",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    legalEntityId: uuid("legal_entity_id").notNull(),
    businessUnitId: uuid("business_unit_id"),
    departmentId: uuid("department_id"),
    costCenterId: uuid("cost_center_id"),
    locationId: uuid("location_id"),
    positionId: uuid("position_id"),
    jobId: uuid("job_id"),
    gradeId: uuid("grade_id"),
    managerEmployeeId: uuid("manager_employee_id"),
    workScheduleId: uuid("work_schedule_id"),
    employmentClass: varchar("employment_class", { length: 50 }),
    fteRatio: varchar("fte_ratio", { length: 20 }).default("1.0000").notNull(),
    assignmentStatus: assignmentStatusEnum("assignment_status").default("active").notNull(),

    ...effectiveDateColumns,
    ...metadataColumns,
  },
  (t) => ({
    employmentCurrentIdx: index("hrm_work_assignments_current_idx").on(
      t.tenantId,
      t.employmentId,
      t.isCurrent,
    ),
    managerIdx: index("hrm_work_assignments_manager_idx").on(
      t.tenantId,
      t.managerEmployeeId,
      t.isCurrent,
    ),
    departmentIdx: index("hrm_work_assignments_department_idx").on(
      t.tenantId,
      t.departmentId,
      t.isCurrent,
    ),
  }),
);

export const hrmEmploymentStatusHistory = pgTable(
  "hrm_employment_status_history",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    oldStatus: varchar("old_status", { length: 50 }),
    newStatus: varchar("new_status", { length: 50 }).notNull(),
    changedAt: date("changed_at").notNull(),
    changedBy: uuid("changed_by"),
    reasonCode: varchar("reason_code", { length: 50 }),
    comment: varchar("comment", { length: 1000 }),

    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_employment_status_history_employment_idx").on(
      t.tenantId,
      t.employmentId,
      t.changedAt,
    ),
  }),
);

export const hrmEmploymentRecordsRelations = relations(hrmEmploymentRecords, ({ one, many }) => ({
  employee: one(hrmEmployeeProfiles, {
    fields: [hrmEmploymentRecords.employeeId],
    references: [hrmEmployeeProfiles.id],
  }),
  contracts: many(hrmEmploymentContracts),
  assignments: many(hrmWorkAssignments),
  statusHistory: many(hrmEmploymentStatusHistory),
}));
```

---

# 5. `hrm-organization.ts`

```ts
// packages/db/src/schema/hrm/hrm-organization.ts
import { pgTable, uniqueIndex, uuid, varchar, integer } from "drizzle-orm/pg-core";
import { effectiveDateColumns, index, metadataColumns, tenantColumns, money } from "./_shared";

export const hrmOrgUnits = pgTable(
  "hrm_org_units",
  {
    ...tenantColumns,

    legalEntityId: uuid("legal_entity_id").notNull(),
    orgUnitCode: varchar("org_unit_code", { length: 50 }).notNull(),
    orgUnitName: varchar("org_unit_name", { length: 255 }).notNull(),
    orgUnitType: varchar("org_unit_type", { length: 50 }).notNull(),
    parentOrgUnitId: uuid("parent_org_unit_id"),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    orgUnitCodeUq: uniqueIndex("hrm_org_units_tenant_code_uq").on(t.tenantId, t.orgUnitCode),
    parentIdx: index("hrm_org_units_parent_idx").on(t.tenantId, t.parentOrgUnitId),
  }),
);

export const hrmJobs = pgTable(
  "hrm_jobs",
  {
    ...tenantColumns,

    jobCode: varchar("job_code", { length: 50 }).notNull(),
    jobTitle: varchar("job_title", { length: 255 }).notNull(),
    jobFamily: varchar("job_family", { length: 100 }),
    jobFunction: varchar("job_function", { length: 100 }),
    jobLevel: varchar("job_level", { length: 50 }),
    description: varchar("description", { length: 2000 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    jobCodeUq: uniqueIndex("hrm_jobs_tenant_job_code_uq").on(t.tenantId, t.jobCode),
  }),
);

export const hrmJobGrades = pgTable(
  "hrm_job_grades",
  {
    ...tenantColumns,

    gradeCode: varchar("grade_code", { length: 50 }).notNull(),
    gradeName: varchar("grade_name", { length: 255 }).notNull(),
    gradeRank: integer("grade_rank"),
    minSalaryAmount: money("min_salary_amount"),
    midSalaryAmount: money("mid_salary_amount"),
    maxSalaryAmount: money("max_salary_amount"),
    currencyCode: varchar("currency_code", { length: 3 }),

    ...metadataColumns,
  },
  (t) => ({
    gradeCodeUq: uniqueIndex("hrm_job_grades_tenant_grade_code_uq").on(t.tenantId, t.gradeCode),
  }),
);

export const hrmPositions = pgTable(
  "hrm_positions",
  {
    ...tenantColumns,

    positionCode: varchar("position_code", { length: 50 }).notNull(),
    positionTitle: varchar("position_title", { length: 255 }).notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    orgUnitId: uuid("org_unit_id"),
    jobId: uuid("job_id"),
    gradeId: uuid("grade_id"),
    costCenterId: uuid("cost_center_id"),
    reportsToPositionId: uuid("reports_to_position_id"),
    positionStatus: varchar("position_status", { length: 50 }).default("open").notNull(),
    isBudgeted: varchar("is_budgeted", { length: 10 }).default("true").notNull(),
    headcountLimit: integer("headcount_limit").default(1),

    ...effectiveDateColumns,
    ...metadataColumns,
  },
  (t) => ({
    positionCodeUq: uniqueIndex("hrm_positions_tenant_position_code_uq").on(
      t.tenantId,
      t.positionCode,
    ),
    orgIdx: index("hrm_positions_org_idx").on(t.tenantId, t.orgUnitId, t.isCurrent),
  }),
);
```

---

# 6. `hrm-compensation.ts`

```ts
// packages/db/src/schema/hrm/hrm-compensation.ts
import { date, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import {
  effectiveDateColumns,
  index,
  metadataColumns,
  money,
  payFrequencyEnum,
  tenantColumns,
} from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmPayGroups = pgTable(
  "hrm_pay_groups",
  {
    ...tenantColumns,

    groupCode: varchar("group_code", { length: 50 }).notNull(),
    groupName: varchar("group_name", { length: 255 }).notNull(),
    payFrequency: payFrequencyEnum("pay_frequency").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    countryCode: varchar("country_code", { length: 3 }),
    legalEntityId: uuid("legal_entity_id").notNull(),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    codeUq: uniqueIndex("hrm_pay_groups_tenant_group_code_uq").on(t.tenantId, t.groupCode),
  }),
);

export const hrmCompensationPackages = pgTable(
  "hrm_compensation_packages",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    salaryBasis: varchar("salary_basis", { length: 50 }).notNull(),
    baseSalaryAmount: money("base_salary_amount").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    payFrequency: payFrequencyEnum("pay_frequency").notNull(),
    payGroupId: uuid("pay_group_id").references(() => hrmPayGroups.id),

    ...effectiveDateColumns,
    ...metadataColumns,
  },
  (t) => ({
    employmentCurrentIdx: index("hrm_comp_packages_current_idx").on(
      t.tenantId,
      t.employmentId,
      t.isCurrent,
    ),
  }),
);

export const hrmCompensationComponents = pgTable(
  "hrm_compensation_components",
  {
    ...tenantColumns,

    compensationPackageId: uuid("compensation_package_id")
      .notNull()
      .references(() => hrmCompensationPackages.id),
    componentType: varchar("component_type", { length: 50 }).notNull(),
    componentCode: varchar("component_code", { length: 50 }).notNull(),
    amountType: varchar("amount_type", { length: 50 }).notNull(),
    amount: money("amount").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }),
    calculationBasis: varchar("calculation_basis", { length: 100 }),
    isRecurring: varchar("is_recurring", { length: 10 }).default("true").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    packageIdx: index("hrm_comp_components_package_idx").on(t.tenantId, t.compensationPackageId),
  }),
);

export const hrmSalaryChangeHistory = pgTable(
  "hrm_salary_change_history",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    oldBaseSalaryAmount: money("old_base_salary_amount"),
    newBaseSalaryAmount: money("new_base_salary_amount").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    changeReason: varchar("change_reason", { length: 100 }),
    approvedBy: uuid("approved_by"),
    approvedAt: date("approved_at"),

    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_salary_change_history_employment_idx").on(
      t.tenantId,
      t.employmentId,
      t.effectiveFrom,
    ),
  }),
);
```

---

# 7. `hrm-payroll.ts`

This is the key financial spine.

```ts
// packages/db/src/schema/hrm/hrm-payroll.ts
import {
  date,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  index,
  metadataColumns,
  money,
  payrollElementCategoryEnum,
  payrollRunStatusEnum,
  payrollRunTypeEnum,
  tenantColumns,
} from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";
import { hrmPayGroups } from "./hrm-compensation";

export const hrmPayrollPeriods = pgTable(
  "hrm_payroll_periods",
  {
    ...tenantColumns,

    payGroupId: uuid("pay_group_id").notNull().references(() => hrmPayGroups.id),
    periodCode: varchar("period_code", { length: 50 }).notNull(),
    periodStartDate: date("period_start_date").notNull(),
    periodEndDate: date("period_end_date").notNull(),
    paymentDate: date("payment_date").notNull(),
    periodStatus: varchar("period_status", { length: 50 }).default("open").notNull(),
    lockedAt: date("locked_at"),

    ...metadataColumns,
  },
  (t) => ({
    periodCodeUq: uniqueIndex("hrm_payroll_periods_tenant_code_uq").on(t.tenantId, t.periodCode),
    payGroupIdx: index("hrm_payroll_periods_pay_group_idx").on(t.tenantId, t.payGroupId),
  }),
);

export const hrmPayrollRuns = pgTable(
  "hrm_payroll_runs",
  {
    ...tenantColumns,

    payrollPeriodId: uuid("payroll_period_id").notNull().references(() => hrmPayrollPeriods.id),
    runType: payrollRunTypeEnum("run_type").notNull(),
    runNumber: varchar("run_number", { length: 50 }).notNull(),
    status: payrollRunStatusEnum("status").default("draft").notNull(),
    submittedAt: date("submitted_at"),
    approvedAt: date("approved_at"),
    approvedBy: uuid("approved_by"),
    finalizedAt: date("finalized_at"),

    ...metadataColumns,
  },
  (t) => ({
    runUq: uniqueIndex("hrm_payroll_runs_tenant_period_run_uq").on(
      t.tenantId,
      t.payrollPeriodId,
      t.runNumber,
    ),
    statusIdx: index("hrm_payroll_runs_status_idx").on(t.tenantId, t.status),
  }),
);

export const hrmPayrollRunEmployees = pgTable(
  "hrm_payroll_run_employees",
  {
    ...tenantColumns,

    payrollRunId: uuid("payroll_run_id").notNull().references(() => hrmPayrollRuns.id),
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    grossAmount: money("gross_amount").default("0").notNull(),
    deductionAmount: money("deduction_amount").default("0").notNull(),
    employerCostAmount: money("employer_cost_amount").default("0").notNull(),
    netAmount: money("net_amount").default("0").notNull(),
    varianceFlag: varchar("variance_flag", { length: 10 }).default("false").notNull(),
    exceptionFlag: varchar("exception_flag", { length: 10 }).default("false").notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    payrollRunEmployeeUq: uniqueIndex("hrm_payroll_run_employees_tenant_run_emp_uq").on(
      t.tenantId,
      t.payrollRunId,
      t.employmentId,
    ),
    runIdx: index("hrm_payroll_run_employees_run_idx").on(t.tenantId, t.payrollRunId),
    employmentIdx: index("hrm_payroll_run_employees_employment_idx").on(t.tenantId, t.employmentId),
  }),
);

export const hrmPayrollInputs = pgTable(
  "hrm_payroll_inputs",
  {
    ...tenantColumns,

    payrollRunId: uuid("payroll_run_id").notNull().references(() => hrmPayrollRuns.id),
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    inputType: varchar("input_type", { length: 50 }).notNull(),
    inputCode: varchar("input_code", { length: 50 }).notNull(),
    sourceModule: varchar("source_module", { length: 50 }).notNull(),
    sourceReferenceId: uuid("source_reference_id"),
    quantity: money("quantity"),
    rate: money("rate"),
    amount: money("amount"),
    currencyCode: varchar("currency_code", { length: 3 }),
    effectiveDate: date("effective_date"),
    status: varchar("status", { length: 50 }).default("pending").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    runIdx: index("hrm_payroll_inputs_run_idx").on(t.tenantId, t.payrollRunId),
    employmentIdx: index("hrm_payroll_inputs_employment_idx").on(t.tenantId, t.employmentId),
  }),
);

export const hrmPayrollElements = pgTable(
  "hrm_payroll_elements",
  {
    ...tenantColumns,

    elementCode: varchar("element_code", { length: 50 }).notNull(),
    elementName: varchar("element_name", { length: 255 }).notNull(),
    elementCategory: payrollElementCategoryEnum("element_category").notNull(),
    taxability: varchar("taxability", { length: 50 }),
    glMappingCode: varchar("gl_mapping_code", { length: 100 }),
    sequenceNo: varchar("sequence_no", { length: 20 }),
    countryCode: varchar("country_code", { length: 3 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    elementCodeUq: uniqueIndex("hrm_payroll_elements_tenant_code_uq").on(t.tenantId, t.elementCode),
  }),
);

export const hrmPayrollResultLines = pgTable(
  "hrm_payroll_result_lines",
  {
    ...tenantColumns,

    payrollRunEmployeeId: uuid("payroll_run_employee_id")
      .notNull()
      .references(() => hrmPayrollRunEmployees.id),
    payrollElementId: uuid("payroll_element_id")
      .notNull()
      .references(() => hrmPayrollElements.id),
    lineType: varchar("line_type", { length: 50 }).notNull(),
    quantity: money("quantity"),
    rate: money("rate"),
    baseAmount: money("base_amount"),
    calculatedAmount: money("calculated_amount").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    taxableAmount: money("taxable_amount"),
    sequenceNo: varchar("sequence_no", { length: 20 }),
    ruleReference: varchar("rule_reference", { length: 255 }),

    ...metadataColumns,
  },
  (t) => ({
    employeeIdx: index("hrm_payroll_result_lines_employee_idx").on(
      t.tenantId,
      t.payrollRunEmployeeId,
    ),
    elementIdx: index("hrm_payroll_result_lines_element_idx").on(t.tenantId, t.payrollElementId),
  }),
);

export const hrmPayslips = pgTable(
  "hrm_payslips",
  {
    ...tenantColumns,

    payrollRunEmployeeId: uuid("payroll_run_employee_id")
      .notNull()
      .references(() => hrmPayrollRunEmployees.id),
    payslipNumber: varchar("payslip_number", { length: 50 }).notNull(),
    publishedAt: date("published_at"),
    fileId: uuid("file_id"),
    accessStatus: varchar("access_status", { length: 50 }).default("draft").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    payslipNumberUq: uniqueIndex("hrm_payslips_tenant_number_uq").on(
      t.tenantId,
      t.payslipNumber,
    ),
  }),
);

export const hrmPayrollGlPostings = pgTable(
  "hrm_payroll_gl_postings",
  {
    ...tenantColumns,

    payrollRunId: uuid("payroll_run_id").notNull().references(() => hrmPayrollRuns.id),
    journalBatchId: uuid("journal_batch_id"),
    postingStatus: varchar("posting_status", { length: 50 }).default("pending").notNull(),
    postedAt: date("posted_at"),
    postedBy: uuid("posted_by"),
    sourceSnapshotId: uuid("source_snapshot_id"),

    ...metadataColumns,
  },
  (t) => ({
    runIdx: index("hrm_payroll_gl_postings_run_idx").on(t.tenantId, t.payrollRunId),
  }),
);

export const hrmPayrollGlPostingLines = pgTable(
  "hrm_payroll_gl_posting_lines",
  {
    ...tenantColumns,

    payrollGlPostingId: uuid("payroll_gl_posting_id")
      .notNull()
      .references(() => hrmPayrollGlPostings.id),
    ledgerAccountId: uuid("ledger_account_id").notNull(),
    costCenterId: uuid("cost_center_id"),
    departmentId: uuid("department_id"),
    projectId: uuid("project_id"),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    debitAmount: money("debit_amount").default("0").notNull(),
    creditAmount: money("credit_amount").default("0").notNull(),
    lineDescription: varchar("line_description", { length: 500 }),

    ...metadataColumns,
  },
  (t) => ({
    postingIdx: index("hrm_payroll_gl_posting_lines_posting_idx").on(
      t.tenantId,
      t.payrollGlPostingId,
    ),
  }),
);
```

---

# 8. `hrm-talent.ts`

```ts
// packages/db/src/schema/hrm/hrm-talent.ts
import { date, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, tenantColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmTalentProfiles = pgTable(
  "hrm_talent_profiles",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    careerAspirationCode: varchar("career_aspiration_code", { length: 50 }),
    mobilityPreference: varchar("mobility_preference", { length: 50 }),
    retentionRiskLevel: varchar("retention_risk_level", { length: 50 }),
    potentialRating: varchar("potential_rating", { length: 50 }),
    readinessRating: varchar("readiness_rating", { length: 50 }),
    lastReviewedAt: date("last_reviewed_at"),

    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_talent_profiles_employment_idx").on(t.tenantId, t.employmentId),
  }),
);

export const hrmSuccessionPlans = pgTable(
  "hrm_succession_plans",
  {
    ...tenantColumns,

    positionId: uuid("position_id").notNull(),
    criticalityLevel: varchar("criticality_level", { length: 50 }),
    planStatus: varchar("plan_status", { length: 50 }).default("draft").notNull(),
    reviewCycle: varchar("review_cycle", { length: 50 }),

    ...metadataColumns,
  },
  (t) => ({
    positionIdx: index("hrm_succession_plans_position_idx").on(t.tenantId, t.positionId),
  }),
);

export const hrmSuccessorCandidates = pgTable(
  "hrm_successor_candidates",
  {
    ...tenantColumns,

    successionPlanId: uuid("succession_plan_id").notNull().references(() => hrmSuccessionPlans.id),
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    readinessLevel: varchar("readiness_level", { length: 50 }),
    riskOfLoss: varchar("risk_of_loss", { length: 50 }),
    rankOrder: varchar("rank_order", { length: 20 }),
    notes: varchar("notes", { length: 2000 }),

    ...metadataColumns,
  },
  (t) => ({
    planIdx: index("hrm_successor_candidates_plan_idx").on(t.tenantId, t.successionPlanId),
    employmentIdx: index("hrm_successor_candidates_employment_idx").on(t.tenantId, t.employmentId),
  }),
);
```

---

# 9. `hrm-learning.ts`

```ts
// packages/db/src/schema/hrm/hrm-learning.ts
import { date, integer, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import {
  index,
  learningCompletionStatusEnum,
  metadataColumns,
  tenantColumns,
} from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmCourses = pgTable(
  "hrm_courses",
  {
    ...tenantColumns,

    courseCode: varchar("course_code", { length: 50 }).notNull(),
    courseName: varchar("course_name", { length: 255 }).notNull(),
    courseType: varchar("course_type", { length: 50 }),
    deliveryMode: varchar("delivery_mode", { length: 50 }),
    durationHours: integer("duration_hours"),
    providerId: uuid("provider_id"),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    courseCodeUq: uniqueIndex("hrm_courses_tenant_course_code_uq").on(t.tenantId, t.courseCode),
  }),
);

export const hrmCourseSessions = pgTable(
  "hrm_course_sessions",
  {
    ...tenantColumns,

    courseId: uuid("course_id").notNull().references(() => hrmCourses.id),
    sessionCode: varchar("session_code", { length: 50 }).notNull(),
    sessionStartAt: date("session_start_at"),
    sessionEndAt: date("session_end_at"),
    capacity: integer("capacity"),
    locationOrLink: varchar("location_or_link", { length: 1000 }),
    status: varchar("status", { length: 50 }).default("planned").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    courseIdx: index("hrm_course_sessions_course_idx").on(t.tenantId, t.courseId),
  }),
);

export const hrmLearningEnrollments = pgTable(
  "hrm_learning_enrollments",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    courseId: uuid("course_id").notNull().references(() => hrmCourses.id),
    courseSessionId: uuid("course_session_id").references(() => hrmCourseSessions.id),
    enrollmentSource: varchar("enrollment_source", { length: 50 }),
    assignedAt: date("assigned_at"),
    dueDate: date("due_date"),
    completionStatus: learningCompletionStatusEnum("completion_status").default("assigned").notNull(),
    completedAt: date("completed_at"),
    score: varchar("score", { length: 20 }),

    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_learning_enrollments_employment_idx").on(t.tenantId, t.employmentId),
    dueDateIdx: index("hrm_learning_enrollments_due_date_idx").on(
      t.tenantId,
      t.dueDate,
      t.completionStatus,
    ),
  }),
);

export const hrmCertifications = pgTable(
  "hrm_certifications",
  {
    ...tenantColumns,

    certificationCode: varchar("certification_code", { length: 50 }).notNull(),
    certificationName: varchar("certification_name", { length: 255 }).notNull(),
    issuingBody: varchar("issuing_body", { length: 255 }),
    validityMonths: integer("validity_months"),
    status: varchar("status", { length: 50 }).default("active").notNull(),

    ...metadataColumns,
  },
  (t) => ({
    certCodeUq: uniqueIndex("hrm_certifications_tenant_cert_code_uq").on(
      t.tenantId,
      t.certificationCode,
    ),
  }),
);

export const hrmEmployeeCertifications = pgTable(
  "hrm_employee_certifications",
  {
    ...tenantColumns,

    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    certificationId: uuid("certification_id").notNull().references(() => hrmCertifications.id),
    certificateNumber: varchar("certificate_number", { length: 100 }),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    verificationStatus: varchar("verification_status", { length: 50 }).default("pending").notNull(),
    evidenceFileId: uuid("evidence_file_id"),

    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_employee_certifications_employment_idx").on(
      t.tenantId,
      t.employmentId,
    ),
    expiryIdx: index("hrm_employee_certifications_expiry_idx").on(t.tenantId, t.expiresAt),
  }),
);
```

---

# 10. `hrm-audit.ts`

```ts
// packages/db/src/schema/hrm/hrm-audit.ts
import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { evidenceTypeEnum, index, tenantColumns } from "./_shared";

export const hrmChangeEvents = pgTable(
  "hrm_change_events",
  {
    ...tenantColumns,

    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    eventPayloadJson: jsonb("event_payload_json").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    occurredBy: uuid("occurred_by"),

  },
  (t) => ({
    aggregateIdx: index("hrm_change_events_aggregate_idx").on(
      t.tenantId,
      t.aggregateType,
      t.aggregateId,
    ),
    eventTypeIdx: index("hrm_change_events_event_type_idx").on(t.tenantId, t.eventType),
  }),
);

export const hrmEvidenceLinks = pgTable(
  "hrm_evidence_links",
  {
    ...tenantColumns,

    referenceTable: varchar("reference_table", { length: 120 }).notNull(),
    referenceId: uuid("reference_id").notNull(),
    fileId: uuid("file_id").notNull(),
    evidenceType: evidenceTypeEnum("evidence_type").notNull(),
    attachedAt: timestamp("attached_at", { withTimezone: true }).defaultNow().notNull(),
    attachedBy: uuid("attached_by"),
  },
  (t) => ({
    referenceIdx: index("hrm_evidence_links_reference_idx").on(
      t.tenantId,
      t.referenceTable,
      t.referenceId,
    ),
  }),
);

export const hrmReviewAttestations = pgTable(
  "hrm_review_attestations",
  {
    ...tenantColumns,

    reviewType: varchar("review_type", { length: 100 }).notNull(),
    referenceTable: varchar("reference_table", { length: 120 }).notNull(),
    referenceId: uuid("reference_id").notNull(),
    attestedBy: uuid("attested_by").notNull(),
    attestedAt: timestamp("attested_at", { withTimezone: true }).defaultNow().notNull(),
    attestationText: varchar("attestation_text", { length: 4000 }),
  },
  (t) => ({
    referenceIdx: index("hrm_review_attestations_reference_idx").on(
      t.tenantId,
      t.referenceTable,
      t.referenceId,
    ),
  }),
);
```

---

# 11. `index.ts`

```ts
// packages/db/src/schema/hrm/index.ts
export * from "./_shared";
export * from "./hrm-employees";
export * from "./hrm-employment";
export * from "./hrm-organization";
export * from "./hrm-compensation";
export * from "./hrm-payroll";
export * from "./hrm-talent";
export * from "./hrm-learning";
export * from "./hrm-audit";
```

---

# 12. What this scaffold already gives you

This gives you a serious ERP-grade foundation for:

* **person master**
* **employee profile**
* **employment truth**
* **work assignment history**
* **org and position structure**
* **compensation package**
* **pay group**
* **payroll period / run / employee result**
* **payroll result lines**
* **payslip**
* **payroll GL staging**
* **talent profile**
* **succession**
* **courses / enrollments / certifications**
* **audit evidence**

That is enough to start your HRM domain properly.

---

# 13. What should be added next

Your next schema files should be:

## `hrm-attendance.ts`

Add:

* `hrm_work_calendars`
* `hrm_holidays`
* `hrm_shift_patterns`
* `hrm_roster_assignments`
* `hrm_attendance_records`
* `hrm_timesheet_entries`

## `hrm-leave.ts`

Add:

* `hrm_leave_types`
* `hrm_leave_balances`
* `hrm_leave_requests`
* `hrm_leave_accrual_runs`
* `hrm_leave_liability_snapshots`

## `hrm-performance.ts`

Add:

* `hrm_goal_cycles`
* `hrm_goals`
* `hrm_performance_reviews`
* `hrm_performance_review_lines`
* `hrm_competency_assessments`

## `hrm-recruitment.ts`

Add:

* `hrm_job_requisitions`
* `hrm_candidates`
* `hrm_candidate_applications`
* `hrm_interviews`
* `hrm_interview_feedback`
* `hrm_offers`

## `hrm-onboarding.ts`

Add:

* `hrm_onboarding_plans`
* `hrm_onboarding_tasks`
* `hrm_probation_reviews`
* `hrm_separation_cases`
* `hrm_exit_clearance_items`

## `hrm-compliance.ts`

Add:

* `hrm_policy_documents`
* `hrm_policy_acknowledgements`
* `hrm_grievance_cases`
* `hrm_disciplinary_actions`
* `hrm_work_permits`
* `hrm_compliance_checks`

---

# 14. Important AFENDA architecture advice

For your ERP, I strongly recommend these rules:

## A. Never merge person, employee, and employment

Keep:

* `hrm_persons`
* `hrm_employee_profiles`
* `hrm_employment_records`

separate.

That is what makes rehire, multiple employments, and workforce history correct.

## B. Make work assignment effective-dated

Do not overwrite department / manager / position directly.
Use `hrm_work_assignments` as the canonical historical layer.

## C. Payroll must be evidence-based

Do not only store:

* gross
* net

Also store:

* run header
* employee run header
* raw inputs
* result lines
* GL staging

That is how you survive audit and reconciliation.

## D. Keep HR truth separate from finance truth

HRM owns:

* payroll calculation result

Finance owns:

* journal posting

Link them, do not collapse them.

## E. Add SoD later at service layer

Schema should support:

* prepared by
* approved by
* finalized by

but actual SoD enforcement should live in domain services and workflow rules.

---

# 15. My suggested implementation order

Build in this exact order:

1. `hrm-employees.ts`
2. `hrm-employment.ts`
3. `hrm-organization.ts`
4. `hrm-compensation.ts`
5. `hrm-payroll.ts`
6. `hrm-attendance.ts`
7. `hrm-leave.ts`
8. `hrm-performance.ts`
9. `hrm-talent.ts`
10. `hrm-learning.ts`
11. `hrm-recruitment.ts`
12. `hrm-onboarding.ts`
13. `hrm-compliance.ts`
14. `hrm-audit.ts`

That order matches actual ERP dependency flow.

---

# 16. Best next step

The best next step is to turn this into:

* **full production-grade Drizzle files**
* with your exact AFENDA conventions
* including:

  * `relations(...)`
  * shared audit columns from your base package
  * references to MDM tables
  * naming conventions aligned to your existing schema registry
  * file paths matching your monorepo

I can do that next as a **Phase 2 scaffold**:
**`hrm-attendance.ts`, `hrm-leave.ts`, and `hrm-performance.ts`**.
