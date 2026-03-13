import { pgTable, pgEnum, uuid, text, jsonb, boolean, index, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization, iamPrincipal } from "../kernel/identity";
import {
  CommInboxEntityTypeValues,
  CommNotificationChannelValues,
  CommCommentEntityTypeValues,
  CommLabelEntityTypeValues,
  CommSavedViewEntityTypeValues,
  CommSubscriptionEntityTypeValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const commCommentEntityTypeEnum = pgEnum(
  "comm_comment_entity_type",
  CommCommentEntityTypeValues,
);

export const commSavedViewEntityTypeEnum = pgEnum(
  "comm_saved_view_entity_type",
  CommSavedViewEntityTypeValues,
);

// Runtime fallback: Vitest API integration occasionally resolves this binding as
// undefined during module graph initialization. Label entity types intentionally
// mirror comment entity types, so fallback keeps schema boot deterministic.
const labelEntityTypeValuesRuntime = CommLabelEntityTypeValues ?? CommCommentEntityTypeValues;
export const commLabelEntityTypeEnum = pgEnum(
  "comm_label_entity_type",
  labelEntityTypeValuesRuntime,
);

export const commSubscriptionEntityTypeEnum = pgEnum(
  "comm_subscription_entity_type",
  CommSubscriptionEntityTypeValues,
);

export const commInboxEntityTypeEnum = pgEnum("comm_inbox_entity_type", CommInboxEntityTypeValues);
export const commNotificationChannelEnum = pgEnum(
  "comm_notification_channel",
  CommNotificationChannelValues,
);

export const commComment = pgTable(
  "comm_comment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    entityType: commCommentEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    parentCommentId: uuid("parent_comment_id"),
    authorPrincipalId: uuid("author_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    editedAt: tsz("edited_at"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_comment_org_entity_idx").on(t.orgId, t.entityType, t.entityId),
    index("comm_comment_parent_idx").on(t.parentCommentId),
    index("comm_comment_author_idx").on(t.authorPrincipalId),
    rlsOrg,
  ],
);

export const commLabel = pgTable(
  "comm_label",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_label_org_name_uidx").on(t.orgId, t.name),
    index("comm_label_org_idx").on(t.orgId),
    index("comm_label_creator_idx").on(t.createdByPrincipalId),
    rlsOrg,
  ],
);

export const commLabelAssignment = pgTable(
  "comm_label_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => commLabel.id, { onDelete: "cascade" }),
    entityType: commLabelEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    assignedByPrincipalId: uuid("assigned_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_label_assignment_org_label_entity_uidx").on(
      t.orgId,
      t.labelId,
      t.entityType,
      t.entityId,
    ),
    index("comm_label_assignment_org_entity_idx").on(t.orgId, t.entityType, t.entityId),
    index("comm_label_assignment_org_label_idx").on(t.orgId, t.labelId),
    rlsOrg,
  ],
);

export const commSavedView = pgTable(
  "comm_saved_view",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id").references(() => iamPrincipal.id, { onDelete: "cascade" }),
    entityType: commSavedViewEntityTypeEnum("entity_type").notNull(),
    name: text("name").notNull(),
    filters: jsonb("filters")
      .notNull()
      .default(sql`'{}'::jsonb`),
    sortBy: jsonb("sort_by")
      .notNull()
      .default(sql`'[]'::jsonb`),
    columns: jsonb("columns")
      .notNull()
      .default(sql`'[]'::jsonb`),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_saved_view_org_entity_idx").on(t.orgId, t.entityType),
    index("comm_saved_view_principal_idx").on(t.principalId),
    rlsOrg,
  ],
);

export const commSubscription = pgTable(
  "comm_subscription",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    entityType: commSubscriptionEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_subscription_org_principal_entity_uidx").on(
      t.orgId,
      t.principalId,
      t.entityType,
      t.entityId,
    ),
    index("comm_subscription_org_principal_idx").on(t.orgId, t.principalId),
    index("comm_subscription_org_entity_idx").on(t.orgId, t.entityType, t.entityId),
    rlsOrg,
  ],
);

export const commInboxItem = pgTable(
  "comm_inbox_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    entityType: commInboxEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: tsz("read_at"),
    occurredAt: tsz("occurred_at").defaultNow().notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_inbox_item_org_principal_read_idx").on(t.orgId, t.principalId, t.isRead),
    index("comm_inbox_item_org_principal_created_idx").on(t.orgId, t.principalId, t.createdAt),
    index("comm_inbox_item_org_entity_idx").on(t.orgId, t.entityType, t.entityId),
    rlsOrg,
  ],
);

export const commNotificationPreference = pgTable(
  "comm_notification_preference",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    channel: commNotificationChannelEnum("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    mutedUntil: tsz("muted_until"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_notification_pref_org_principal_event_channel_uidx").on(
      t.orgId,
      t.principalId,
      t.eventType,
      t.channel,
    ),
    index("comm_notification_pref_org_principal_idx").on(t.orgId, t.principalId),
    rlsOrg,
  ],
);
