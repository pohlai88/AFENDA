import { bigint, integer, jsonb, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { index, metadataColumns, orgColumns } from "./_shared";
import { hrmOrgUnits } from "./hrm-organization";
import { hrmPositions } from "./hrm-organization";

export const hrmWorkforcePlans = pgTable(
  "hrm_workforce_plans",
  {
    ...orgColumns,
    planCode: varchar("plan_code", { length: 50 }).notNull(),
    planName: varchar("plan_name", { length: 255 }).notNull(),
    planYear: integer("plan_year").notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    planCodeUq: uniqueIndex("hrm_workforce_plans_org_code_uq").on(
      t.orgId,
      t.planCode,
    ),
    planYearIdx: index("hrm_workforce_plans_plan_year_idx").on(
      t.orgId,
      t.planYear,
    ),
  }),
);

export const hrmWorkforceScenarios = pgTable(
  "hrm_workforce_scenarios",
  {
    ...orgColumns,
    workforcePlanId: uuid("workforce_plan_id")
      .notNull()
      .references(() => hrmWorkforcePlans.id),
    scenarioName: varchar("scenario_name", { length: 255 }).notNull(),
    assumptionsJson: jsonb("assumptions_json"),
    ...metadataColumns,
  },
  (t) => ({
    planIdx: index("hrm_workforce_scenarios_plan_idx").on(
      t.orgId,
      t.workforcePlanId,
    ),
  }),
);

export const hrmPositionBudgets = pgTable(
  "hrm_position_budgets",
  {
    ...orgColumns,
    orgUnitId: uuid("org_unit_id")
      .notNull()
      .references(() => hrmOrgUnits.id),
    positionId: uuid("position_id")
      .notNull()
      .references(() => hrmPositions.id),
    planYear: integer("plan_year").notNull(),
    approvedHeadcount: integer("approved_headcount").notNull(),
    budgetAmount: bigint("budget_amount", { mode: "bigint" }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    orgUnitPositionYearUq: uniqueIndex(
      "hrm_position_budgets_org_unit_position_year_uq",
    ).on(t.orgId, t.orgUnitId, t.positionId, t.planYear),
    orgUnitIdx: index("hrm_position_budgets_org_unit_idx").on(
      t.orgId,
      t.orgUnitId,
    ),
    planYearIdx: index("hrm_position_budgets_plan_year_idx").on(
      t.orgId,
      t.planYear,
    ),
  }),
);

export const hrmHiringForecasts = pgTable(
  "hrm_hiring_forecasts",
  {
    ...orgColumns,
    workforcePlanId: uuid("workforce_plan_id")
      .notNull()
      .references(() => hrmWorkforcePlans.id),
    positionId: uuid("position_id")
      .notNull()
      .references(() => hrmPositions.id),
    quarter: varchar("quarter", { length: 20 }).notNull(),
    plannedHires: integer("planned_hires").notNull(),
    ...metadataColumns,
  },
  (t) => ({
    planPositionQuarterUq: uniqueIndex(
      "hrm_hiring_forecasts_plan_position_quarter_uq",
    ).on(t.orgId, t.workforcePlanId, t.positionId, t.quarter),
    planIdx: index("hrm_hiring_forecasts_plan_idx").on(
      t.orgId,
      t.workforcePlanId,
    ),
  }),
);

export const hrmLaborCostProjections = pgTable(
  "hrm_labor_cost_projections",
  {
    ...orgColumns,
    workforcePlanId: uuid("workforce_plan_id")
      .notNull()
      .references(() => hrmWorkforcePlans.id),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => hrmWorkforceScenarios.id),
    orgUnitId: uuid("org_unit_id")
      .notNull()
      .references(() => hrmOrgUnits.id),
    projectedAmount: bigint("projected_amount", { mode: "bigint" }).notNull(),
    ...metadataColumns,
  },
  (t) => ({
    planScenarioOrgUq: uniqueIndex(
      "hrm_labor_cost_projections_plan_scenario_org_uq",
    ).on(t.orgId, t.workforcePlanId, t.scenarioId, t.orgUnitId),
    planIdx: index("hrm_labor_cost_projections_plan_idx").on(
      t.orgId,
      t.workforcePlanId,
    ),
    scenarioIdx: index("hrm_labor_cost_projections_scenario_idx").on(
      t.orgId,
      t.scenarioId,
    ),
  }),
);
