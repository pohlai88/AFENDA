/**
 * AUTH_REVIEW_ESCALATIONS — overdue control escalation records.
 *
 * Escalation path when controls or reviews exceed due dates; notify owners,
 * then escalate to internal audit. Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authReviewEscalations = pgTable(
  "auth_review_escalations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewCycleId: text("review_cycle_id").notNull(),
    escalationLevel: text("escalation_level").notNull(),
    triggeredAt: tsz("triggered_at").defaultNow().notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    cycleIdx: index("auth_review_escalations_cycle_idx").on(t.reviewCycleId),
    statusIdx: index("auth_review_escalations_status_idx").on(t.status),
  }),
);
