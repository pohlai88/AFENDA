import { z } from "zod";
import { EntityIdSchema, OrgIdSchema, PrincipalIdSchema, UuidSchema } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

export const CommSubscriptionIdSchema = UuidSchema.brand<"CommSubscriptionId">();

export const CommSubscriptionEntityTypeValues = [
  "task",
  "project",
  "approval_request",
  "document",
  "board_meeting",
  "announcement",
] as const;

export const CommSubscriptionEntityTypeSchema = z.enum(CommSubscriptionEntityTypeValues);

export const CommSubscriptionSchema = z.object({
  id: CommSubscriptionIdSchema,
  orgId: OrgIdSchema,
  principalId: PrincipalIdSchema,
  entityType: CommSubscriptionEntityTypeSchema,
  entityId: EntityIdSchema,
  createdAt: UtcDateTimeSchema,
});

export const SubscribeEntityCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: CommSubscriptionEntityTypeSchema,
  entityId: EntityIdSchema,
});

export const UnsubscribeEntityCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: CommSubscriptionEntityTypeSchema,
  entityId: EntityIdSchema,
});

export type CommSubscriptionId = z.infer<typeof CommSubscriptionIdSchema>;
export type CommSubscriptionEntityType = z.infer<typeof CommSubscriptionEntityTypeSchema>;
export type CommSubscription = z.infer<typeof CommSubscriptionSchema>;
export type SubscribeEntityCommand = z.infer<typeof SubscribeEntityCommandSchema>;
export type UnsubscribeEntityCommand = z.infer<typeof UnsubscribeEntityCommandSchema>;
