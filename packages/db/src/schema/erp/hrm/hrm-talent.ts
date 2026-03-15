import { boolean, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmEmploymentRecords } from "./hrm-employment";
import { hrmPositions } from "./hrm-organization";

export const hrmTalentProfiles = pgTable(
  "hrm_talent_profiles",
  {
    ...orgColumns,
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    potentialScore: integer("potential_score"),
    readinessScore: integer("readiness_score"),
    careerAspiration: varchar("career_aspiration", { length: 2000 }),
    ...metadataColumns,
  },
  (t) => ({
    employmentUq: uniqueIndex("hrm_talent_profiles_employment_uq").on(t.orgId, t.employmentId),
    employmentIdx: index("hrm_talent_profiles_employment_idx").on(t.orgId, t.employmentId),
  }),
);

export const hrmSuccessionPlans = pgTable(
  "hrm_succession_plans",
  {
    ...orgColumns,
    positionId: uuid("position_id")
      .notNull()
      .references(() => hrmPositions.id),
    criticalRoleFlag: boolean("critical_role_flag").default(false).notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    positionUq: uniqueIndex("hrm_succession_plans_position_uq").on(t.orgId, t.positionId),
    positionIdx: index("hrm_succession_plans_position_idx").on(t.orgId, t.positionId),
    statusIdx: index("hrm_succession_plans_status_idx").on(t.orgId, t.status),
  }),
);

export const hrmSuccessorNominations = pgTable(
  "hrm_successor_nominations",
  {
    ...orgColumns,
    successionPlanId: uuid("succession_plan_id")
      .notNull()
      .references(() => hrmSuccessionPlans.id),
    employmentId: uuid("employment_id")
      .notNull()
      .references(() => hrmEmploymentRecords.id),
    readinessLevel: varchar("readiness_level", { length: 50 }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    planEmploymentUq: uniqueIndex("hrm_successor_nominations_plan_emp_uq").on(
      t.orgId,
      t.successionPlanId,
      t.employmentId,
    ),
    planIdx: index("hrm_successor_nominations_plan_idx").on(
      t.orgId,
      t.successionPlanId,
    ),
    employmentIdx: index("hrm_successor_nominations_employment_idx").on(
      t.orgId,
      t.employmentId,
    ),
  }),
);
