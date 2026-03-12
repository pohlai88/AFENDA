import { boolean, date, numeric, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { approvalColumns, index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmLeaveTypes = pgTable(
  "hrm_leave_types",
  {
    ...orgColumns,
    leaveTypeCode: varchar("leave_type_code", { length: 50 }).notNull(),
    leaveTypeName: varchar("leave_type_name", { length: 255 }).notNull(),
    leaveUnit: varchar("leave_unit", { length: 20 }).default("day").notNull(),
    isPaid: boolean("is_paid").default(true).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    leaveTypeCodeUq: uniqueIndex("hrm_leave_types_org_code_uq").on(t.orgId, t.leaveTypeCode),
  }),
);

export const hrmLeaveBalances = pgTable(
  "hrm_leave_balances",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => hrmLeaveTypes.id),
    accrualPeriod: varchar("accrual_period", { length: 20 }).notNull(),
    openingBalance: numeric("opening_balance", { precision: 20, scale: 6 }).default("0").notNull(),
    accruedAmount: numeric("accrued_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    consumedAmount: numeric("consumed_amount", { precision: 20, scale: 6 }).default("0").notNull(),
    closingBalance: numeric("closing_balance", { precision: 20, scale: 6 }).default("0").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    uniqBalanceIdx: uniqueIndex("hrm_leave_balances_unique_uq").on(
      t.orgId,
      t.employmentId,
      t.leaveTypeId,
      t.accrualPeriod,
    ),
    periodIdx: index("hrm_leave_balances_period_idx").on(t.orgId, t.accrualPeriod),
  }),
);

export const hrmLeaveRequests = pgTable(
  "hrm_leave_requests",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => hrmLeaveTypes.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    requestedAmount: numeric("requested_amount", { precision: 20, scale: 6 }).notNull(),
    reason: varchar("reason", { length: 500 }),
    ...approvalColumns,
    ...metadataColumns,
  },
  (t) => ({
    employmentIdx: index("hrm_leave_requests_employment_idx").on(
      t.orgId,
      t.employmentId,
      t.startDate,
    ),
    statusIdx: index("hrm_leave_requests_status_idx").on(t.orgId, t.status),
  }),
);
