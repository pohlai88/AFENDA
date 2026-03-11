/**
 * AUTH_APPROVAL_MATRIX — role-based approval rules.
 *
 * Who can approve which framework, control, or evidence package;
 * multi-level sign-off where required. Platform-wide (no org_id).
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

export const authApprovalMatrix = pgTable(
  "auth_approval_matrix",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    framework: text("framework").notNull(),
    reviewType: text("review_type").notNull(),
    minApprovals: integer("min_approvals").notNull().default(1),
    requiredRoles: jsonb("required_roles").$type<string[]>().notNull(),
    escalationRole: text("escalation_role"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    frameworkIdx: index("auth_approval_matrix_framework_idx").on(t.framework),
    reviewTypeIdx: index("auth_approval_matrix_review_type_idx").on(
      t.reviewType,
    ),
  }),
);
