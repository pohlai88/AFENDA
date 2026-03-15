import { date, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";

export const hrmReviewCycles = pgTable(
  "hrm_review_cycles",
  {
    ...orgColumns,
    cycleCode: varchar("cycle_code", { length: 50 }).notNull(),
    cycleName: varchar("cycle_name", { length: 255 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    cycleCodeUq: uniqueIndex("hrm_review_cycles_org_code_uq").on(t.orgId, t.cycleCode),
    statusIdx: index("hrm_review_cycles_status_idx").on(t.orgId, t.status),
  }),
);

export const hrmPerformanceReviews = pgTable(
  "hrm_performance_reviews",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    reviewCycleId: uuid("review_cycle_id")
      .notNull()
      .references(() => hrmReviewCycles.id),
    reviewerEmploymentId: uuid("reviewer_employment_id").references(() => hrmEmploymentRecords.id),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    overallRating: varchar("overall_rating", { length: 50 }),
    selfSubmittedAt: timestamp("self_submitted_at", { withTimezone: true }),
    managerCompletedAt: timestamp("manager_completed_at", { withTimezone: true }),
    ...metadataColumns,
  },
  (t) => ({
    employmentCycleUq: uniqueIndex("hrm_performance_reviews_emp_cycle_uq").on(
      t.orgId,
      t.employmentId,
      t.reviewCycleId,
    ),
    employmentIdx: index("hrm_performance_reviews_employment_idx").on(t.orgId, t.employmentId),
    cycleIdx: index("hrm_performance_reviews_cycle_idx").on(t.orgId, t.reviewCycleId),
    reviewerIdx: index("hrm_performance_reviews_reviewer_idx").on(
      t.orgId,
      t.reviewerEmploymentId,
    ),
  }),
);

export const hrmPerformanceGoals = pgTable(
  "hrm_performance_goals",
  {
    ...orgColumns,
    performanceReviewId: uuid("performance_review_id")
      .notNull()
      .references(() => hrmPerformanceReviews.id),
    goalText: varchar("goal_text", { length: 1000 }).notNull(),
    targetDate: date("target_date"),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    reviewIdx: index("hrm_performance_goals_review_idx").on(
      t.orgId,
      t.performanceReviewId,
    ),
  }),
);

export const hrmCompetencyAssessments = pgTable(
  "hrm_competency_assessments",
  {
    ...orgColumns,
    performanceReviewId: uuid("performance_review_id")
      .notNull()
      .references(() => hrmPerformanceReviews.id),
    competencyCode: varchar("competency_code", { length: 50 }).notNull(),
    rating: varchar("rating", { length: 20 }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    reviewIdx: index("hrm_competency_assessments_review_idx").on(
      t.orgId,
      t.performanceReviewId,
    ),
  }),
);
