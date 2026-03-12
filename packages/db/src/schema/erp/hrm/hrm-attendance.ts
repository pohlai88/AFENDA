import { boolean, date, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmWorkCalendars = pgTable(
  "hrm_work_calendars",
  {
    ...orgColumns,
    calendarCode: varchar("calendar_code", { length: 50 }).notNull(),
    calendarName: varchar("calendar_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    calendarCodeUq: uniqueIndex("hrm_work_calendars_org_code_uq").on(t.orgId, t.calendarCode),
  }),
);

export const hrmCalendarHolidays = pgTable(
  "hrm_calendar_holidays",
  {
    ...orgColumns,
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => hrmWorkCalendars.id),
    holidayDate: date("holiday_date").notNull(),
    holidayName: varchar("holiday_name", { length: 255 }).notNull(),
    isPaidHoliday: boolean("is_paid_holiday").default(true).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    uniqHolidayIdx: uniqueIndex("hrm_calendar_holidays_unique_uq").on(
      t.orgId,
      t.calendarId,
      t.holidayDate,
    ),
    calendarIdx: index("hrm_calendar_holidays_calendar_idx").on(t.orgId, t.calendarId),
  }),
);

export const hrmShifts = pgTable(
  "hrm_shifts",
  {
    ...orgColumns,
    shiftCode: varchar("shift_code", { length: 50 }).notNull(),
    shiftName: varchar("shift_name", { length: 255 }).notNull(),
    shiftType: varchar("shift_type", { length: 50 }).default("fixed").notNull(),
    startTime: varchar("start_time", { length: 8 }).notNull(),
    endTime: varchar("end_time", { length: 8 }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    shiftCodeUq: uniqueIndex("hrm_shifts_org_code_uq").on(t.orgId, t.shiftCode),
  }),
);

export const hrmRosterAssignments = pgTable(
  "hrm_roster_assignments",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => hrmShifts.id),
    workDate: date("work_date").notNull(),
    status: varchar("status", { length: 50 }).default("scheduled").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    uniqRosterIdx: uniqueIndex("hrm_roster_assignments_unique_uq").on(
      t.orgId,
      t.employmentId,
      t.workDate,
    ),
    shiftIdx: index("hrm_roster_assignments_shift_idx").on(t.orgId, t.shiftId, t.workDate),
  }),
);

export const hrmAttendanceRecords = pgTable(
  "hrm_attendance_records",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    workDate: date("work_date").notNull(),
    attendanceStatus: varchar("attendance_status", { length: 50 }).default("present").notNull(),
    checkInAt: timestamp("check_in_at", { withTimezone: true }),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    source: varchar("source", { length: 50 }),
    ...metadataColumns,
  },
  (t) => ({
    uniqAttendanceIdx: uniqueIndex("hrm_attendance_records_unique_uq").on(
      t.orgId,
      t.employmentId,
      t.workDate,
    ),
    employmentIdx: index("hrm_attendance_records_employment_idx").on(t.orgId, t.employmentId),
  }),
);
