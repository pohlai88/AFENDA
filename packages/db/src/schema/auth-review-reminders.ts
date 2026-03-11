/**
 * AUTH_REVIEW_REMINDERS — reviewer reminder records.
 *
 * Notifications when reviews are assigned, due soon, or overdue.
 * Platform-wide (no org_id).
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authReviewReminders = pgTable(
  "auth_review_reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewCycleId: text("review_cycle_id").notNull(),
    recipientUserId: text("recipient_user_id").notNull(),
    reminderType: text("reminder_type").notNull(),
    dispatchedAt: tsz("dispatched_at"),
    status: text("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => ({
    cycleIdx: index("auth_review_reminders_cycle_idx").on(t.reviewCycleId),
    statusIdx: index("auth_review_reminders_status_idx").on(t.status),
  }),
);
