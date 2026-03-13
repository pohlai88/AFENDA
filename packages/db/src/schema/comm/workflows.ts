import { pgEnum, pgTable, uuid, text, integer, index, jsonb } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import { WorkflowStatusValues, WorkflowRunStatusValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const commWorkflowStatusEnum = pgEnum("comm_workflow_status", WorkflowStatusValues);

export const commWorkflowRunStatusEnum = pgEnum(
  "comm_workflow_run_status",
  WorkflowRunStatusValues,
);

// ─── Workflow Table ───────────────────────────────────────────────────────────

export const commWorkflow = pgTable(
  "comm_workflow",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: commWorkflowStatusEnum("status").notNull().default("draft"),
    trigger: jsonb("trigger")
      .$type<{
        type: string;
        conditions?: Array<{
          field: string;
          operator: string;
          value?: unknown;
        }>;
      }>()
      .notNull(),
    actions: jsonb("actions")
      .$type<
        Array<{
          type: string;
          config: Record<string, unknown>;
        }>
      >()
      .notNull(),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
    lastTriggeredAt: tsz("last_triggered_at"),
    runCount: integer("run_count").notNull().default(0),
  },
  (t) => [
    index("comm_workflow_org_status_idx").on(t.orgId, t.status),
    index("comm_workflow_org_idx").on(t.orgId),
    index("comm_workflow_created_by_idx").on(t.createdByPrincipalId),
    rlsOrg,
  ],
);

// ─── Workflow Run Table ───────────────────────────────────────────────────────

export const commWorkflowRun = pgTable(
  "comm_workflow_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => commWorkflow.id, { onDelete: "cascade" }),
    status: commWorkflowRunStatusEnum("status").notNull().default("pending"),
    triggerEventId: uuid("trigger_event_id"),
    triggerPayload: jsonb("trigger_payload").$type<Record<string, unknown>>().notNull(),
    startedAt: tsz("started_at").defaultNow().notNull(),
    completedAt: tsz("completed_at"),
    error: text("error"),
    executedActions: jsonb("executed_actions")
      .$type<
        Array<{
          actionType: string;
          status: string;
          result?: unknown;
          error?: string;
        }>
      >()
      .notNull()
      .default([]),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_workflow_run_workflow_idx").on(t.workflowId),
    index("comm_workflow_run_org_status_idx").on(t.orgId, t.status),
    index("comm_workflow_run_org_idx").on(t.orgId),
    index("comm_workflow_run_created_at_idx").on(t.createdAt),
    rlsOrg,
  ],
);
