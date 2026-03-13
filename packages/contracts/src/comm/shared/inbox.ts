import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";

// ─── ID Brands ────────────────────────────────────────────────────────────────

export const CommInboxItemIdSchema = UuidSchema.brand<"CommInboxItemId">();
export const CommNotificationPreferenceIdSchema =
  UuidSchema.brand<"CommNotificationPreferenceId">();

// ─── Enum Values & Schemas ────────────────────────────────────────────────────

export const CommInboxEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommInboxEntityTypeSchema = z.enum(CommInboxEntityTypeValues);

export const CommNotificationChannelValues = ["in_app", "email"] as const;
export const CommNotificationChannelSchema = z.enum(CommNotificationChannelValues);

// ─── Reusable Field Schemas ───────────────────────────────────────────────────

const EventTypeSchema = z.string().trim().min(1).max(120);
const TitleSchema = z.string().trim().min(1).max(200);
const BodySchema = z.string().trim().max(10_000);

// ─── Entity Schemas ───────────────────────────────────────────────────────────

export const CommInboxItemSchema = z
  .object({
    id: CommInboxItemIdSchema,
    orgId: OrgIdSchema,
    principalId: PrincipalIdSchema,
    eventType: EventTypeSchema,
    entityType: CommInboxEntityTypeSchema,
    entityId: EntityIdSchema,
    title: TitleSchema,
    body: BodySchema.nullable().default(null),
    isRead: z.boolean(),
    readAt: UtcDateTimeSchema.nullable().default(null),
    occurredAt: UtcDateTimeSchema,
    createdAt: UtcDateTimeSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.isRead && data.readAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "readAt must only be set if isRead is true.",
        path: ["readAt"],
      });
    }
  });

export const CommNotificationPreferenceSchema = z.object({
  id: CommNotificationPreferenceIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  eventType: EventTypeSchema,
  channel: CommNotificationChannelSchema,
  enabled: z.boolean(),
  mutedUntil: UtcDateTimeSchema.nullable().default(null),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

// ─── Base Command Schema ──────────────────────────────────────────────────────

const InboxCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const MarkInboxItemReadCommandSchema = InboxCommandBase.extend({
  itemId: CommInboxItemIdSchema,
});

export const MarkAllInboxReadCommandSchema = InboxCommandBase;

export const UpsertNotificationPreferenceCommandSchema = InboxCommandBase.extend({
  eventType: EventTypeSchema,
  channel: CommNotificationChannelSchema,
  enabled: z.boolean(),
  mutedUntil: UtcDateTimeSchema.nullable().optional().default(null),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommInboxItemId = z.infer<typeof CommInboxItemIdSchema>;
export type CommNotificationPreferenceId = z.infer<typeof CommNotificationPreferenceIdSchema>;
export type CommInboxEntityType = z.infer<typeof CommInboxEntityTypeSchema>;
export type CommNotificationChannel = z.infer<typeof CommNotificationChannelSchema>;
export type CommInboxItem = z.infer<typeof CommInboxItemSchema>;
export type CommNotificationPreference = z.infer<typeof CommNotificationPreferenceSchema>;
export type MarkInboxItemReadCommand = z.infer<typeof MarkInboxItemReadCommandSchema>;
export type MarkAllInboxReadCommand = z.infer<typeof MarkAllInboxReadCommandSchema>;
export type UpsertNotificationPreferenceCommand = z.infer<
  typeof UpsertNotificationPreferenceCommandSchema
>;
