import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workerTypeEnum = pgEnum("hrm_worker_type", [
  "employee",
  "contractor",
  "intern",
  "director",
]);

export const employmentTypeEnum = pgEnum("hrm_employment_type", [
  "permanent",
  "contract",
  "temporary",
  "internship",
  "outsourced",
]);

export const employmentStatusEnum = pgEnum("hrm_employment_status", [
  "draft",
  "active",
  "probation",
  "suspended",
  "terminated",
  "inactive",
]);

export const assignmentStatusEnum = pgEnum("hrm_assignment_status", [
  "active",
  "inactive",
  "historical",
]);

export const approvalStatusEnum = pgEnum("hrm_approval_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
]);

export const positionStatusEnum = pgEnum("hrm_position_status", [
  "draft",
  "open",
  "filled",
  "frozen",
  "closed",
]);

export const money = (name: string) =>
  numeric(name, { precision: 20, scale: 6 });

export const orgColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
  versionNo: integer("version_no").default(1).notNull(),
};

export const effectiveDateColumns = {
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  isCurrent: boolean("is_current").default(true).notNull(),
  changeReason: varchar("change_reason", { length: 120 }),
};

export const approvalColumns = {
  status: approvalStatusEnum("status").default("draft").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  submittedBy: uuid("submitted_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectedBy: uuid("rejected_by"),
  rejectionReason: varchar("rejection_reason", { length: 500 }),
};

export const metadataColumns = {
  metadata: jsonb("metadata"),
};

export { index };
