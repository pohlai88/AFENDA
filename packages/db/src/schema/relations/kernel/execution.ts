/**
 * Relations — kernel/execution (outbox, idempotency, sequence)
 */
import { relations } from "drizzle-orm";
import { organization } from "../../kernel/identity.js";
import { outboxEvent } from "../../kernel/execution/outbox.js";
import { idempotency } from "../../kernel/execution/idempotency.js";
import { sequence } from "../../kernel/execution/numbering.js";

export const outboxEventRelations = relations(outboxEvent, ({ one }) => ({
  organization: one(organization, {
    fields: [outboxEvent.orgId],
    references: [organization.id],
  }),
}));

export const idempotencyRelations = relations(idempotency, ({ one }) => ({
  organization: one(organization, {
    fields: [idempotency.orgId],
    references: [organization.id],
  }),
}));

export const sequenceRelations = relations(sequence, ({ one }) => ({
  organization: one(organization, {
    fields: [sequence.orgId],
    references: [organization.id],
  }),
}));
