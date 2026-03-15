import { bigint, date, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { index, metadataColumns, money, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";
import { account } from "../finance/gl";

export const hrmPayrollPeriods = pgTable(
  "hrm_payroll_periods",
  {
    ...orgColumns,
    periodCode: varchar("period_code", { length: 50 }).notNull(),
    periodStartDate: date("period_start_date").notNull(),
    periodEndDate: date("period_end_date").notNull(),
    paymentDate: date("payment_date").notNull(),
    periodStatus: varchar("period_status", { length: 50 }).default("open").notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    ...metadataColumns,
  },
  (t) => ({
    periodCodeUq: uniqueIndex("hrm_payroll_periods_org_code_uq").on(t.orgId, t.periodCode),
    statusIdx: index("hrm_payroll_periods_status_idx").on(t.orgId, t.periodStatus),
  }),
);

export const hrmPayrollRuns = pgTable(
  "hrm_payroll_runs",
  {
    ...orgColumns,
    payrollPeriodId: uuid("payroll_period_id")
      .notNull()
      .references(() => hrmPayrollPeriods.id),
    runType: varchar("run_type", { length: 30 }).default("regular").notNull(),
    runNumber: varchar("run_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    ...metadataColumns,
  },
  (t) => ({
    runUq: uniqueIndex("hrm_payroll_runs_org_period_run_uq").on(
      t.orgId,
      t.payrollPeriodId,
      t.runNumber,
    ),
    statusIdx: index("hrm_payroll_runs_status_idx").on(t.orgId, t.status),
    periodIdx: index("hrm_payroll_runs_period_idx").on(t.orgId, t.payrollPeriodId),
  }),
);

export const hrmPayrollRunEmployees = pgTable(
  "hrm_payroll_run_employees",
  {
    ...orgColumns,
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => hrmPayrollRuns.id),
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
    grossAmount: money("gross_amount").default("0").notNull(),
    deductionAmount: money("deduction_amount").default("0").notNull(),
    employerCostAmount: money("employer_cost_amount").default("0").notNull(),
    netAmount: money("net_amount").default("0").notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    runEmploymentUq: uniqueIndex("hrm_payroll_run_employees_run_emp_uq").on(
      t.orgId,
      t.payrollRunId,
      t.employmentId,
    ),
    runIdx: index("hrm_payroll_run_employees_run_idx").on(t.orgId, t.payrollRunId),
    employmentIdx: index("hrm_payroll_run_employees_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
  }),
);

export const hrmPayrollInputs = pgTable(
  "hrm_payroll_inputs",
  {
    ...orgColumns,
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => hrmPayrollRuns.id),
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
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
    runIdx: index("hrm_payroll_inputs_run_idx").on(t.orgId, t.payrollRunId),
    employmentIdx: index("hrm_payroll_inputs_employment_idx").on(t.orgId, t.employmentId),
  }),
);

export const hrmPayrollElements = pgTable(
  "hrm_payroll_elements",
  {
    ...orgColumns,
    elementCode: varchar("element_code", { length: 50 }).notNull(),
    elementName: varchar("element_name", { length: 255 }).notNull(),
    elementCategory: varchar("element_category", { length: 30 }).notNull(),
    glMappingCode: varchar("gl_mapping_code", { length: 100 }),
    sequenceNo: varchar("sequence_no", { length: 20 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    elementCodeUq: uniqueIndex("hrm_payroll_elements_org_code_uq").on(t.orgId, t.elementCode),
  }),
);

export const hrmPayrollResultLines = pgTable(
  "hrm_payroll_result_lines",
  {
    ...orgColumns,
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
    ...metadataColumns,
  },
  (t) => ({
    employeeIdx: index("hrm_payroll_result_lines_employee_idx").on(
      t.orgId,
      t.payrollRunEmployeeId,
    ),
    elementIdx: index("hrm_payroll_result_lines_element_idx").on(
      t.orgId,
      t.payrollElementId,
    ),
  }),
);

export const hrmPayslips = pgTable(
  "hrm_payslips",
  {
    ...orgColumns,
    payrollRunEmployeeId: uuid("payroll_run_employee_id")
      .notNull()
      .references(() => hrmPayrollRunEmployees.id),
    payslipNumber: varchar("payslip_number", { length: 50 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    accessStatus: varchar("access_status", { length: 50 }).default("published").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    payslipNumberUq: uniqueIndex("hrm_payslips_org_number_uq").on(t.orgId, t.payslipNumber),
    runEmployeeIdx: index("hrm_payslips_run_employee_idx").on(
      t.orgId,
      t.payrollRunEmployeeId,
    ),
  }),
);

export const hrmPayrollPaymentBatches = pgTable(
  "hrm_payroll_payment_batches",
  {
    ...orgColumns,
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => hrmPayrollRuns.id),
    batchNumber: varchar("batch_number", { length: 50 }).notNull(),
    totalAmount: money("total_amount").default("0").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    batchNumberUq: uniqueIndex("hrm_payroll_payment_batches_org_number_uq").on(
      t.orgId,
      t.batchNumber,
    ),
    runIdx: index("hrm_payroll_payment_batches_run_idx").on(t.orgId, t.payrollRunId),
  }),
);

export const hrmPayrollPaymentInstructions = pgTable(
  "hrm_payroll_payment_instructions",
  {
    ...orgColumns,
    paymentBatchId: uuid("payment_batch_id")
      .notNull()
      .references(() => hrmPayrollPaymentBatches.id),
    payrollRunEmployeeId: uuid("payroll_run_employee_id")
      .notNull()
      .references(() => hrmPayrollRunEmployees.id),
    amount: money("amount").default("0").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull().default("USD"),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    batchEmployeeUq: uniqueIndex("hrm_payroll_payment_instructions_batch_emp_uq").on(
      t.orgId,
      t.paymentBatchId,
      t.payrollRunEmployeeId,
    ),
    batchIdx: index("hrm_payroll_payment_instructions_batch_idx").on(
      t.orgId,
      t.paymentBatchId,
    ),
  }),
);

export const hrmPayrollGlPostings = pgTable(
  "hrm_payroll_gl_postings",
  {
    ...orgColumns,
    payrollRunId: uuid("payroll_run_id")
      .notNull()
      .references(() => hrmPayrollRuns.id),
    journalEntryId: uuid("journal_entry_id"),
    postingStatus: varchar("posting_status", { length: 50 }).default("pending").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    ...metadataColumns,
  },
  (t) => ({
    runUq: uniqueIndex("hrm_payroll_gl_postings_run_uq").on(t.orgId, t.payrollRunId),
    statusIdx: index("hrm_payroll_gl_postings_status_idx").on(t.orgId, t.postingStatus),
  }),
);

export const hrmPayrollGlPostingLines = pgTable(
  "hrm_payroll_gl_posting_lines",
  {
    ...orgColumns,
    payrollGlPostingId: uuid("payroll_gl_posting_id")
      .notNull()
      .references(() => hrmPayrollGlPostings.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => account.id),
    debitMinor: bigint("debit_minor", { mode: "bigint" }).notNull().default(sql`0::bigint`),
    creditMinor: bigint("credit_minor", { mode: "bigint" }).notNull().default(sql`0::bigint`),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    memo: varchar("memo", { length: 500 }),
    ...metadataColumns,
  },
  (t) => ({
    postingIdx: index("hrm_payroll_gl_posting_lines_posting_idx").on(
      t.orgId,
      t.payrollGlPostingId,
    ),
    accountIdx: index("hrm_payroll_gl_posting_lines_account_idx").on(t.orgId, t.accountId),
  }),
);
