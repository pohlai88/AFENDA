import { z } from "zod";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ─── ID Brand ─────────────────────────────────────────────────────────────────

export const CommSubscriptionIdSchema = UuidSchema.brand<"CommSubscriptionId">();

// ─── Enum Values & Schema ─────────────────────────────────────────────────────

export const CommSubscriptionEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommSubscriptionEntityTypeSchema = z.enum(CommSubscriptionEntityTypeValues);

// ─── Entity Schema ────────────────────────────────────────────────────────────

export const CommSubscriptionSchema = z.object({
  id: CommSubscriptionIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  entityType: CommSubscriptionEntityTypeSchema,
  entityId: EntityIdSchema,
  createdAt: UtcDateTimeSchema,
});

// ─── Base Command Schema ──────────────────────────────────────────────────────

const SubscriptionCommandBase = z.object({
  idempotencyKey: IdempotencyKeySchema,
});

// ─── Commands ─────────────────────────────────────────────────────────────────

export const SubscribeEntityCommandSchema = SubscriptionCommandBase.extend({
  entityType: CommSubscriptionEntityTypeSchema,
  entityId: EntityIdSchema,
});

export const UnsubscribeEntityCommandSchema = SubscriptionCommandBase.extend({
  entityType: CommSubscriptionEntityTypeSchema,
  entityId: EntityIdSchema,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommSubscriptionId = z.infer<typeof CommSubscriptionIdSchema>;
export type CommSubscriptionEntityType = z.infer<typeof CommSubscriptionEntityTypeSchema>;
export type CommSubscription = z.infer<typeof CommSubscriptionSchema>;
export type SubscribeEntityCommand = z.infer<typeof SubscribeEntityCommandSchema>;
export type UnsubscribeEntityCommand = z.infer<typeof UnsubscribeEntityCommandSchema>;
