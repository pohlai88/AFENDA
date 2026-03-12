import { index, integer, jsonb, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { organization } from "../../../kernel/identity";
import {
  LiquidityScenarioStatusValues,
  LiquidityScenarioTypeValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../../../_helpers";

export const liquidityScenarioStatusEnum = pgEnum(
  "liquidity_scenario_status",
  LiquidityScenarioStatusValues,
);
export const liquidityScenarioTypeEnum = pgEnum(
  "liquidity_scenario_type",
  LiquidityScenarioTypeValues,
);

export const liquidityScenario = pgTable(
  "liquidity_scenario",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    scenarioType: liquidityScenarioTypeEnum("scenario_type").notNull(),
    status: liquidityScenarioStatusEnum("status").notNull().default("draft"),
    horizonDays: integer("horizon_days").notNull(),
    assumptionSetVersion: text("assumption_set_version").notNull(),
    assumptionsJson: jsonb("assumptions_json").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("liquidity_scenario_org_code_uidx").on(t.orgId, t.code),
    index("liquidity_scenario_org_status_idx").on(t.orgId, t.status),
    rlsOrg,
  ],
);
