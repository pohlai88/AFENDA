import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  unique,
  index,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "../kernel/identity";
import {
  MeetingStatusValues,
  AttendeeStatusValues,
  ResolutionStatusValues,
  VoteValues,
  ActionItemStatusValues,
} from "@afenda/contracts";
import { tsz, rlsOrg } from "../_helpers";

export const commBoardMeetingStatusEnum = pgEnum(
  "comm_board_meeting_status",
  MeetingStatusValues,
);

export const commBoardMeeting = pgTable(
  "comm_board_meeting",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    meetingNumber: text("meeting_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: commBoardMeetingStatusEnum("status").notNull().default("draft"),
    scheduledAt: tsz("scheduled_at"),
    duration: integer("duration").notNull().default(60),
    location: text("location"),
    chairId: uuid("chair_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    secretaryId: uuid("secretary_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    quorumRequired: integer("quorum_required").notNull().default(1),
    startedAt: tsz("started_at"),
    adjournedAt: tsz("adjourned_at"),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_board_meeting_org_number_uidx").on(t.orgId, t.meetingNumber),
    index("comm_board_meeting_org_status_idx").on(t.orgId, t.status),
    index("comm_board_meeting_org_scheduled_idx").on(t.orgId, t.scheduledAt),
    index("comm_board_meeting_chair_idx").on(t.chairId),
    rlsOrg,
  ],
);

export const commBoardAgendaItem = pgTable(
  "comm_board_agenda_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => commBoardMeeting.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    title: text("title").notNull(),
    description: text("description"),
    presenterId: uuid("presenter_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    durationMinutes: integer("duration_minutes"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_board_agenda_item_meeting_idx").on(t.meetingId),
    index("comm_board_agenda_item_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

export const commBoardMeetingAttendeeStatusEnum = pgEnum(
  "comm_board_meeting_attendee_status",
  AttendeeStatusValues,
);

export const commBoardMeetingAttendee = pgTable(
  "comm_board_meeting_attendee",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => commBoardMeeting.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    status: commBoardMeetingAttendeeStatusEnum("status").notNull().default("invited"),
    role: text("role"),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_board_meeting_attendee_meeting_principal_uidx").on(t.meetingId, t.principalId),
    index("comm_board_meeting_attendee_meeting_idx").on(t.meetingId),
    index("comm_board_meeting_attendee_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

export const commBoardResolutionStatusEnum = pgEnum(
  "comm_board_resolution_status",
  ResolutionStatusValues,
);

export const commBoardResolutionVoteValueEnum = pgEnum(
  "comm_board_resolution_vote_value",
  VoteValues,
);

export const commBoardResolution = pgTable(
  "comm_board_resolution",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => commBoardMeeting.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: commBoardResolutionStatusEnum("status").notNull().default("proposed"),
    proposedById: uuid("proposed_by_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_board_resolution_meeting_idx").on(t.meetingId),
    index("comm_board_resolution_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

export const commBoardResolutionVote = pgTable(
  "comm_board_resolution_vote",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => commBoardResolution.id, { onDelete: "cascade" }),
    principalId: uuid("principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "cascade" }),
    vote: commBoardResolutionVoteValueEnum("vote").notNull(),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("comm_board_resolution_vote_resolution_principal_uidx").on(
      t.resolutionId,
      t.principalId,
    ),
    index("comm_board_resolution_vote_resolution_idx").on(t.resolutionId),
    index("comm_board_resolution_vote_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

// ─── Minutes and action items ─────────────────────────────────────────────────

export const commBoardMinutes = pgTable(
  "comm_board_minutes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => commBoardMeeting.id, { onDelete: "cascade" }),
    resolutionId: uuid("resolution_id").references(() => commBoardResolution.id, {
      onDelete: "set null",
    }),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    recordedAt: tsz("recorded_at").defaultNow().notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("comm_board_minutes_meeting_idx").on(t.meetingId),
    index("comm_board_minutes_org_idx").on(t.orgId),
    rlsOrg,
  ],
);

export const commBoardActionItemStatusEnum = pgEnum(
  "comm_board_action_item_status",
  ActionItemStatusValues,
);

export const commBoardActionItem = pgTable(
  "comm_board_action_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    minuteId: uuid("minute_id")
      .notNull()
      .references(() => commBoardMinutes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id").references(() => iamPrincipal.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date"),
    status: commBoardActionItemStatusEnum("status").notNull().default("open"),
    createdByPrincipalId: uuid("created_by_principal_id")
      .notNull()
      .references(() => iamPrincipal.id, { onDelete: "restrict" }),
    createdAt: tsz("created_at").defaultNow().notNull(),
    updatedAt: tsz("updated_at").defaultNow().notNull(),
    closedAt: tsz("closed_at"),
  },
  (t) => [
    index("comm_board_action_item_minute_idx").on(t.minuteId),
    index("comm_board_action_item_assignee_idx").on(t.assigneeId),
    index("comm_board_action_item_due_date_idx").on(t.dueDate),
    index("comm_board_action_item_org_idx").on(t.orgId),
    rlsOrg,
  ],
);
