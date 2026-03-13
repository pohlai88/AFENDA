import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";

export const CommInboxItemIdSchema = UuidSchema.brand<"CommInboxItemId">();
export const CommNotificationPreferenceIdSchema =
  UuidSchema.brand<"CommNotificationPreferenceId">();

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

export const CommInboxItemSchema = z.object({
  id: CommInboxItemIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  eventType: z.string().trim().min(1).max(120),
  entityType: CommInboxEntityTypeSchema,
  entityId: EntityIdSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(10_000).nullable(),
  isRead: z.boolean(),
  readAt: UtcDateTimeSchema.nullable(),
  occurredAt: UtcDateTimeSchema,
  createdAt: UtcDateTimeSchema,
});

export const CommNotificationPreferenceSchema = z.object({
  id: CommNotificationPreferenceIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  eventType: z.string().trim().min(1).max(120),
  channel: CommNotificationChannelSchema,
  enabled: z.boolean(),
  mutedUntil: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const MarkInboxItemReadCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  itemId: CommInboxItemIdSchema,
});

export const MarkAllInboxReadCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

export const UpsertNotificationPreferenceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  eventType: z.string().trim().min(1).max(120),
  channel: CommNotificationChannelSchema,
  enabled: z.boolean(),
  mutedUntil: UtcDateTimeSchema.optional().nullable(),
});

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
