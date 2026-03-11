/**
 * AUTH_REVIEW_CASES — SOX / ISO / audit review workflow cases.
 *
 * Structured workflows for external audit review: evidence package assembly,
 * reviewer access, sign-off, and archival. Platform-wide (no org_id).
 */
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authReviewCases = pgTable(
  "auth_review_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    framework: text("framework").notNull(),
    status: text("status").notNull().default("open"),
    title: text("title").notNull(),
    description: text("description"),
    ownerUserId: text("owner_user_id"),
    dueAt: tsz("due_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    frameworkIdx: index("auth_review_cases_framework_idx").on(t.framework),
    statusIdx: index("auth_review_cases_status_idx").on(t.status),
    dueIdx: index("auth_review_cases_due_at_idx").on(t.dueAt),
  }),
);
