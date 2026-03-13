import { pgEnum, pgTable, uuid, text, jsonb, index, unique } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import { AnnouncementStatusValues, AnnouncementAudienceTypeValues } from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const commAnnouncementStatusEnum = pgEnum(
  "comm_announcement_status",
  AnnouncementStatusValues,
);

export const commAnnouncementAudienceTypeEnum = pgEnum(
  "comm_announcement_audience_type",
  AnnouncementAudienceTypeValues,
);

// ── comm_announcement ─────────────────────────────────────────────────────────
export const commAnnouncement = pgTable(
  "comm_announcement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    announcementNumber: text("announcement_number").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: commAnnouncementStatusEnum("status").notNull().default("draft"),
    audienceType: commAnnouncementAudienceTypeEnum("audience_type").notNull(),
    /** JSON array of team or role UUIDs; empty [] = whole org */
    audienceIds: jsonb("audience_ids").notNull().default([]),
    scheduledAt: tsz("scheduled_at"),
    publishedAt: tsz("published_at"),
    publishedByPrincipalId: uuid("published_by_principal_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_announcement_org_number_uidx").on(t.orgId, t.announcementNumber),
    index("comm_announcement_org_status_idx").on(t.orgId, t.status),
    index("comm_announcement_org_published_idx").on(t.orgId, t.publishedAt),
    index("comm_announcement_org_creator_idx").on(t.orgId, t.createdByPrincipalId),
    rlsOrg,
  ],
);

// ── comm_announcement_read ────────────────────────────────────────────────────
export const commAnnouncementRead = pgTable(
  "comm_announcement_read",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => commAnnouncement.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    acknowledgedAt: tsz("acknowledged_at").defaultNow().notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_announcement_read_org_announce_principal_uidx").on(
      t.orgId,
      t.announcementId,
      t.principalId,
    ),
    index("comm_announcement_read_announcement_idx").on(t.announcementId),
    index("comm_announcement_read_principal_idx").on(t.orgId, t.principalId),
    rlsOrg,
  ],
);
