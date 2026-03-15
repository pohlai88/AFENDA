import { z } from "zod";
import { UtcDateTimeSchema } from "../../shared/datetime.js";
import {
  CorrelationIdSchema,
  EntityIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../shared/ids.js";
import {
  CommChatterContextEntityTypeSchema,
  CommChatterMessageIdSchema,
} from "./chatter.entity.js";

const CommChatterEventContextPayloadSchema = z.object({
  orgId: OrgIdSchema,
  entityType: CommChatterContextEntityTypeSchema,
  entityId: EntityIdSchema,
  correlationId: CorrelationIdSchema,
});

const CommChatterEventMessageRefPayloadSchema = z.object({
  messageId: CommChatterMessageIdSchema,
});

// ─── Chatter Message Posted ───────────────────────────────────────────────────

export const CommChatterMessagePostedPayloadSchema = CommChatterEventMessageRefPayloadSchema.merge(
  CommChatterEventContextPayloadSchema,
).extend({
  parentMessageId: CommChatterMessageIdSchema.nullable(),
  authorPrincipalId: PrincipalIdSchema,
});

export type CommChatterMessagePostedPayload = z.infer<typeof CommChatterMessagePostedPayloadSchema>;

/** @alias */
export const ChatterMessagePostedEventSchema = CommChatterMessagePostedPayloadSchema;
export type ChatterMessagePostedEvent = CommChatterMessagePostedPayload;

// ─── Chatter Message Updated ──────────────────────────────────────────────────

export const CommChatterMessageUpdatedPayloadSchema = CommChatterEventMessageRefPayloadSchema.merge(
  CommChatterEventContextPayloadSchema,
).extend({
  editedAt: UtcDateTimeSchema,
});

export type CommChatterMessageUpdatedPayload = z.infer<
  typeof CommChatterMessageUpdatedPayloadSchema
>;

/** @alias */
export const ChatterMessageUpdatedEventSchema = CommChatterMessageUpdatedPayloadSchema;
export type ChatterMessageUpdatedEvent = CommChatterMessageUpdatedPayload;

// ─── Chatter Message Deleted ──────────────────────────────────────────────────

export const CommChatterMessageDeletedPayloadSchema = CommChatterEventMessageRefPayloadSchema.merge(
  CommChatterEventContextPayloadSchema,
).extend({
  deletedByPrincipalId: PrincipalIdSchema,
});

export type CommChatterMessageDeletedPayload = z.infer<
  typeof CommChatterMessageDeletedPayloadSchema
>;

/** @alias */
export const ChatterMessageDeletedEventSchema = CommChatterMessageDeletedPayloadSchema;
export type ChatterMessageDeletedEvent = CommChatterMessageDeletedPayload;

export const ChatterEventPayloadSchemas = {
  MessagePosted: CommChatterMessagePostedPayloadSchema,
  MessageUpdated: CommChatterMessageUpdatedPayloadSchema,
  MessageDeleted: CommChatterMessageDeletedPayloadSchema,
} as const;
