import { date, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmPolicyDocuments = pgTable(
  "hrm_policy_documents",
  {
    ...orgColumns,
    documentCode: varchar("document_code", { length: 50 }).notNull(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    version: varchar("version", { length: 50 }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    requiredRole: varchar("required_role", { length: 100 }),
    ...metadataColumns,
  },
  (t) => ({
    documentCodeUq: uniqueIndex("hrm_policy_documents_org_code_uq").on(
      t.orgId,
      t.documentCode,
    ),
    effectiveIdx: index("hrm_policy_documents_effective_idx").on(
      t.orgId,
      t.effectiveFrom,
      t.effectiveTo,
    ),
  }),
);

export const hrmPolicyAcknowledgements = pgTable(
  "hrm_policy_acknowledgements",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    policyDocumentId: uuid("policy_document_id")
      .notNull()
      .references(() => hrmPolicyDocuments.id),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    ...metadataColumns,
  },
  (t) => ({
    empDocUq: uniqueIndex("hrm_policy_acknowledgements_emp_doc_uq").on(
      t.orgId,
      t.employmentId,
      t.policyDocumentId,
    ),
    employmentIdx: index("hrm_policy_acknowledgements_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
    policyDocIdx: index("hrm_policy_acknowledgements_policy_doc_idx").on(
      t.orgId,
      t.policyDocumentId,
    ),
  }),
);

export const hrmComplianceChecks = pgTable(
  "hrm_compliance_checks",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    checkType: varchar("check_type", { length: 100 }).notNull(),
    checkDate: date("check_date").notNull(),
    dueDate: date("due_date"),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_compliance_checks_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
    checkTypeIdx: index("hrm_compliance_checks_type_idx").on(t.orgId, t.checkType),
    statusIdx: index("hrm_compliance_checks_status_idx").on(t.orgId, t.status),
    dueDateIdx: index("hrm_compliance_checks_due_date_idx").on(t.orgId, t.dueDate),
  }),
);

export const hrmWorkPermitRecords = pgTable(
  "hrm_work_permit_records",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    permitType: varchar("permit_type", { length: 100 }).notNull(),
    permitNumber: varchar("permit_number", { length: 100 }).notNull(),
    issuedDate: date("issued_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_work_permit_records_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
    expiryIdx: index("hrm_work_permit_records_expiry_idx").on(
      t.orgId,
      t.expiryDate,
    ),
  }),
);
