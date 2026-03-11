/**
 * AUTH_REVIEW_CYCLES — scheduled quarterly/monthly review cycles.
 *
 * Links to control definitions and attestation cycles. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authReviewCycles = pgTable(
  "auth_review_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    framework: text("framework").notNull(),
    periodType: text("period_type").notNull(),
    periodLabel: text("period_label").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("scheduled"),
    ownerUserId: text("owner_user_id"),
    reviewerUserId: text("reviewer_user_id"),
    approverUserId: text("approver_user_id"),
    dueAt: tsz("due_at"),
    openedAt: tsz("opened_at"),
    closedAt: tsz("closed_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    frameworkIdx: index("auth_review_cycles_framework_idx").on(t.framework),
    statusIdx: index("auth_review_cycles_status_idx").on(t.status),
    dueIdx: index("auth_review_cycles_due_at_idx").on(t.dueAt),
    periodIdx: index("auth_review_cycles_period_label_idx").on(t.periodLabel),
  }),
);
