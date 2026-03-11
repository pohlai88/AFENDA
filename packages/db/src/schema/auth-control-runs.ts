/**
 * AUTH_CONTROL_RUNS — periodic compliance control execution records.
 *
 * Stores results of AUTH-CTRL-* checks (failed sign-in review, MFA failures,
 * audit outbox health, etc.). Platform-wide (no org_id).
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tsz } from "./_helpers";

export const authControlRuns = pgTable(
  "auth_control_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    controlCode: text("control_code").notNull(),
    framework: text("framework").notNull(),
    status: text("status").notNull(),
    summary: text("summary").notNull(),
    findingsCount: integer("findings_count").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    startedAt: tsz("started_at").defaultNow().notNull(),
    completedAt: tsz("completed_at").defaultNow().notNull(),
  },
  (t) => ({
    controlIdx: index("auth_control_runs_control_code_idx").on(t.controlCode),
    frameworkIdx: index("auth_control_runs_framework_idx").on(t.framework),
    startedIdx: index("auth_control_runs_started_at_idx").on(t.startedAt),
  }),
);
