import { pgEnum, pgTable, uuid, text, integer, boolean, index, unique } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import {
  ApprovalStatusValues,
  ApprovalStepStatusValues,
  ApprovalUrgencyValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const commApprovalStatusEnum = pgEnum("comm_approval_status", ApprovalStatusValues);
export const commApprovalStepStatusEnum = pgEnum(
  "comm_approval_step_status",
  ApprovalStepStatusValues,
);
export const commApprovalUrgencyEnum = pgEnum("comm_approval_urgency", ApprovalUrgencyValues);

// ── approval_request ──────────────────────────────────────────────────────────
export const commApprovalRequest = pgTable(
  "comm_approval_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    approvalNumber: text("approval_number").notNull(),
    title: text("title").notNull(),
    sourceEntityType: text("source_entity_type").notNull(),
    sourceEntityId: text("source_entity_id").notNull(),
    requestedByPrincipalId: uuid("requested_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    status: commApprovalStatusEnum("status").notNull().default("pending"),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    totalSteps: integer("total_steps").notNull(),
    urgency: commApprovalUrgencyEnum("urgency").notNull().default("normal"),
    dueDate: text("due_date"), // ISO date string YYYY-MM-DD
    resolvedAt: tsz("resolved_at"),
    resolvedByPrincipalId: uuid("resolved_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_approval_request_org_number_uidx").on(t.orgId, t.approvalNumber),
    index("comm_approval_request_org_status_idx").on(t.orgId, t.status),
    index("comm_approval_request_org_requester_idx").on(t.orgId, t.requestedByPrincipalId),
    index("comm_approval_request_source_idx").on(t.sourceEntityType, t.sourceEntityId),
    rlsOrg,
  ],
);

// ── approval_step ─────────────────────────────────────────────────────────────
export const commApprovalStep = pgTable(
  "comm_approval_step",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    approvalRequestId: uuid("approval_request_id")
      .notNull()
      .references(() => commApprovalRequest.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    label: text("label"),
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    delegatedToId: uuid("delegated_to_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    status: commApprovalStepStatusEnum("status").notNull().default("pending"),
    comment: text("comment"),
    actedAt: tsz("acted_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_approval_step_request_index_uidx").on(t.approvalRequestId, t.stepIndex),
    index("comm_approval_step_assignee_status_idx").on(t.assigneeId, t.status),
    index("comm_approval_step_request_idx").on(t.approvalRequestId),
    index("comm_approval_step_org_assignee_idx").on(t.orgId, t.assigneeId),
    rlsOrg,
  ],
);

// ── approval_policy ───────────────────────────────────────────────────────────
export const commApprovalPolicy = pgTable(
  "comm_approval_policy",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceEntityType: text("source_entity_type").notNull(),
    autoApproveBelowAmount: integer("auto_approve_below_amount"),
    escalationAfterHours: integer("escalation_after_hours"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [index("comm_approval_policy_org_entity_idx").on(t.orgId, t.sourceEntityType), rlsOrg],
);

// ── approval_delegation ───────────────────────────────────────────────────────
export const commApprovalDelegation = pgTable(
  "comm_approval_delegation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    fromPrincipalId: uuid("from_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    toPrincipalId: uuid("to_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    validFrom: text("valid_from").notNull(), // ISO date YYYY-MM-DD
    validUntil: text("valid_until").notNull(), // ISO date YYYY-MM-DD
    reason: text("reason"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_approval_delegation_from_idx").on(t.orgId, t.fromPrincipalId),
    index("comm_approval_delegation_to_idx").on(t.orgId, t.toPrincipalId),
    rlsOrg,
  ],
);

// ── approval_status_history ───────────────────────────────────────────────────
export const commApprovalStatusHistory = pgTable(
  "comm_approval_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    approvalRequestId: uuid("approval_request_id")
      .notNull()
      .references(() => commApprovalRequest.id, { onDelete: "cascade" }),
    fromStatus: commApprovalStatusEnum("from_status").notNull(),
    toStatus: commApprovalStatusEnum("to_status").notNull(),
    changedByPrincipalId: uuid("changed_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    occurredAt: tsz("occurred_at").defaultNow().notNull(),
  },
  (t) => [index("comm_approval_status_history_request_idx").on(t.approvalRequestId), rlsOrg],
);
