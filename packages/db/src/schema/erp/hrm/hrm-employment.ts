import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  pgTable,
  timestamp,
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
  orgColumns,
} from "./_shared";
import { hrmEmployeeProfiles } from "./hrm-employees";

export const hrmEmploymentRecords = pgTable(
  "hrm_employment_records",
  {
    ...orgColumns,
    employeeId: uuid("employee_id").notNull().references(() => hrmEmployeeProfiles.id),
    legalEntityId: uuid("legal_entity_id").notNull(),
    employmentNumber: varchar("employment_number", { length: 50 }).notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    hireDate: date("hire_date").notNull(),
    startDate: date("start_date").notNull(),
    probationEndDate: date("probation_end_date"),
    terminationDate: date("termination_date"),
    employmentStatus: employmentStatusEnum("employment_status").default("draft").notNull(),
    payrollStatus: varchar("payroll_status", { length: 50 }).default("inactive").notNull(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    impactAssessmentStatus: varchar("impact_assessment_status", { length: 50 }).default("none"),
    ...metadataColumns,
  },
  (t) => ({
    employmentNumberUq: uniqueIndex("hrm_employment_records_org_number_uq").on(
      t.orgId,
      t.employmentNumber,
    ),
    employeeIdx: index("hrm_employment_records_employee_idx").on(t.orgId, t.employeeId),
    statusIdx: index("hrm_employment_records_status_idx").on(t.orgId, t.employmentStatus),
  }),
);

export const hrmWorkAssignments = pgTable(
  "hrm_work_assignments",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    legalEntityId: uuid("legal_entity_id").notNull(),
    businessUnitId: uuid("business_unit_id"),
    departmentId: uuid("department_id"),
    costCenterId: uuid("cost_center_id"),
    positionId: uuid("position_id"),
    jobId: uuid("job_id"),
    gradeId: uuid("grade_id"),
    managerEmployeeId: uuid("manager_employee_id"),
    fteRatio: varchar("fte_ratio", { length: 20 }).default("1.0000").notNull(),
    assignmentStatus: assignmentStatusEnum("assignment_status").default("active").notNull(),
    ...effectiveDateColumns,
    ...metadataColumns,
  },
  (t) => ({
    employmentCurrentIdx: index("hrm_work_assignments_current_idx").on(t.orgId, t.employmentId, t.isCurrent),
    managerIdx: index("hrm_work_assignments_manager_idx").on(t.orgId, t.managerEmployeeId, t.isCurrent),
  }),
);

export const hrmEmploymentStatusHistory = pgTable(
  "hrm_employment_status_history",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    oldStatus: varchar("old_status", { length: 50 }),
    newStatus: varchar("new_status", { length: 50 }).notNull(),
    changedAt: date("changed_at").notNull(),
    changedBy: uuid("changed_by"),
    reasonCode: varchar("reason_code", { length: 50 }),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_employment_status_history_employment_idx").on(
      t.orgId,
      t.employmentId,
      t.changedAt,
    ),
  }),
);

export const hrmEmploymentContracts = pgTable(
  "hrm_employment_contracts",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    contractNumber: varchar("contract_number", { length: 80 }).notNull(),
    contractType: varchar("contract_type", { length: 50 }).notNull(),
    contractStartDate: date("contract_start_date").notNull(),
    contractEndDate: date("contract_end_date"),
    documentFileId: uuid("document_file_id"),
    contractStatus: varchar("contract_status", { length: 50 }).default("active"),
    signedBy: uuid("signed_by"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    documentChecksum: varchar("document_checksum", { length: 128 }),
    ...metadataColumns,
  },
  (t) => ({
    contractNumberUq: uniqueIndex("hrm_employment_contracts_org_number_uq").on(
      t.orgId,
      t.contractNumber,
    ),
    employmentIdx: index("hrm_employment_contracts_employment_idx").on(t.orgId, t.employmentId),
  }),
);

export const hrmEmployeeDocuments = pgTable(
  "hrm_employee_documents",
  {
    ...orgColumns,
    employmentId: uuid("employment_id").notNull().references(() => hrmEmploymentRecords.id),
    documentType: varchar("document_type", { length: 80 }).notNull(),
    fileReference: varchar("file_reference", { length: 512 }).notNull(),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_employee_documents_employment_idx").on(t.orgId, t.employmentId),
  }),
);

export const hrmEmploymentRecordsRelations = relations(hrmEmploymentRecords, ({ one, many }) => ({
  employee: one(hrmEmployeeProfiles, {
    fields: [hrmEmploymentRecords.employeeId],
    references: [hrmEmployeeProfiles.id],
  }),
  assignments: many(hrmWorkAssignments),
  statusHistory: many(hrmEmploymentStatusHistory),
  contracts: many(hrmEmploymentContracts),
  documents: many(hrmEmployeeDocuments),
}));
