import { z } from "zod";
import { EntityIdSchema } from "../../shared/ids.js";
import { CommListLimitSchema } from "./query.js";
import { makeCommListResponseSchema } from "./response.js";
import {
  CommSubscriptionEntityTypeSchema,
  CommSubscriptionIdSchema,
  CommSubscriptionSchema,
} from "./subscription.js";

export const ListSubscriptionsQuerySchema = z.object({
  entityType: CommSubscriptionEntityTypeSchema.optional(),
  entityId: EntityIdSchema.optional(),
  limit: CommListLimitSchema,
  cursor: CommSubscriptionIdSchema.optional(),
});

export const ListSubscriptionsResponseSchema = makeCommListResponseSchema(CommSubscriptionSchema);

export type ListSubscriptionsQuery = z.infer<typeof ListSubscriptionsQuerySchema>;
export type ListSubscriptionsResponse = z.infer<typeof ListSubscriptionsResponseSchema>;
