import { date, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmGrievanceCases = pgTable(
  "hrm_grievance_cases",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    caseType: varchar("case_type", { length: 50 }).notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 50 }).default("open").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_grievance_cases_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
    statusIdx: index("hrm_grievance_cases_status_idx").on(t.orgId, t.status),
  }),
);

export const hrmDisciplinaryActions = pgTable(
  "hrm_disciplinary_actions",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    actionType: varchar("action_type", { length: 50 }).notNull(),
    effectiveDate: date("effective_date").notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    notes: text("notes"),
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_disciplinary_actions_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
    statusIdx: index("hrm_disciplinary_actions_status_idx").on(
      t.orgId,
      t.status,
    ),
  }),
);

export const hrmHrCaseEvidence = pgTable(
  "hrm_hr_case_evidence",
  {
    ...orgColumns,
    caseType: varchar("case_type", { length: 50 }).notNull(),
    caseId: uuid("case_id").notNull(),
    evidenceType: varchar("evidence_type", { length: 50 }).notNull(),
    fileReference: varchar("file_reference", { length: 500 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    caseIdx: index("hrm_hr_case_evidence_case_idx").on(t.orgId, t.caseType, t.caseId),
  }),
);
